import { NextResponse } from "next/server";
import { getCurrentPrincipal } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
export async function POST(request:Request) {
 const principal=await getCurrentPrincipal();
 if (!principal || principal.role === "USER") return NextResponse.json({error:"Доступ запрещён"},{status:403});
 let body:unknown; try {body=await request.json();}catch{return NextResponse.json({error:"Неверный JSON"},{status:400});}
 if (!body || typeof body !== "object") return NextResponse.json({error:"Неверные данные"},{status:400});
 const {listingId,text} = body as Record<string,unknown>;
 if(typeof listingId!=="string" || typeof text!=="string" || text.trim().length<3 || text.length>2000) return NextResponse.json({error:"Неверный комментарий"},{status:400});
 if(!await prisma.listing.findUnique({where:{id:listingId},select:{id:true}})) return NextResponse.json({error:"Товар не найден"},{status:404});
 await prisma.moderationComment.create({data:{listingId,authorId:principal.id,text:text.trim()}});
 return NextResponse.json({ok:true},{status:201});
}
