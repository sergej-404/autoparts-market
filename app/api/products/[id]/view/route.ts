import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 if(!await prisma.listing.findUnique({where:{id},select:{id:true,status:true}})) return NextResponse.json({error:"Не найдено"},{status:404});
 await prisma.listingViewEvent.create({data:{listingId:id}});
 return NextResponse.json({ok:true});
}
