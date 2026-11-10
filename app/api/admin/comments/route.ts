import {NextResponse} from "next/server";
import {adminApiGuard} from "@/lib/admin-api";
import {prisma} from "@/lib/prisma";
export async function GET(){const guard=await adminApiGuard();if(guard.response)return guard.response;const comments=await prisma.moderationComment.findMany({orderBy:{createdAt:"desc"},take:500});return NextResponse.json({comments});}
