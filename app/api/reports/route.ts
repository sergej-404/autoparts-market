import { NextResponse } from "next/server";
import { getCurrentPrincipal } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { chatReasons, productReasons } from "@/lib/moderation";
export async function POST(request: Request) {
 const principal = await getCurrentPrincipal();
 if (!principal) return NextResponse.json({error:"Требуется вход"},{status:401});
 let body: unknown;
 try { body = await request.json(); } catch { return NextResponse.json({error:"Неверный JSON"},{status:400}); }
 if (!body || typeof body !== "object") return NextResponse.json({error:"Неверные данные"},{status:400});
 const data = body as Record<string,unknown>;
 const {kind,targetId,reason,details} = data;
 if ((kind !== "PRODUCT" && kind !== "CHAT") || typeof targetId !== "string" || !targetId || targetId.length > 120 || typeof reason !== "string" || !(kind === "PRODUCT" ? productReasons : chatReasons).includes(reason) || typeof details !== "string" || details.trim().length < 5 || details.length > 2000) return NextResponse.json({error:"Проверьте причину и описание (5–2000 символов)"},{status:400});
 if (kind === "PRODUCT") { if (!await prisma.listing.findUnique({where:{id:targetId},select:{id:true}})) return NextResponse.json({error:"Товар не найден"},{status:404}); }
 else { const conversation = await prisma.chatConversation.findUnique({where:{id:targetId},select:{buyerId:true,sellerId:true}}); if (!conversation || (conversation.buyerId !== principal.id && conversation.sellerId !== principal.id)) return NextResponse.json({error:"Диалог недоступен"},{status:403}); }
 await prisma.moderationReport.create({data:{kind,targetId,reason,details:details.trim(),reporterId:principal.id}});
 return NextResponse.json({ok:true},{status:201});
}
