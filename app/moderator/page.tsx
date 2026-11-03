import {requireRole} from "@/lib/authorization";
import {prisma} from "@/lib/prisma";
import {ModeratorPanel} from "./ModeratorPanel";
export const metadata={title:"Модерация | AXION X"};
export default async function ModeratorPage(){
 await requireRole("MODERATOR");
 const analyticsStart = new Date();
 analyticsStart.setUTCDate(analyticsStart.getUTCDate() - 366);
 const [listings,orders,favorites,views,conversations,reports,users,viewEvents,favoriteEvents,chatEvents,orderEvents]=await Promise.all([
 prisma.listing.findMany({select:{id:true,title:true,price:true,images:true,status:true,createdAt:true,quantity:true},orderBy:{createdAt:"desc"},take:500}),
 prisma.orderItem.groupBy({by:["listingId"],_sum:{quantity:true},orderBy:{_sum:{quantity:"desc"}},take:500}),
 prisma.listingFavoriteEvent.groupBy({by:["listingId"],_count:{id:true},orderBy:{_count:{id:"desc"}},take:500}),
 prisma.listingViewEvent.groupBy({by:["listingId"],_count:{id:true},orderBy:{_count:{id:"desc"}},take:500}),
 prisma.chatConversation.groupBy({by:["listingId"],_count:{id:true},orderBy:{_count:{id:"desc"}},take:500}),
 prisma.moderationReport.findMany({orderBy:{createdAt:"desc"},take:300}),
 prisma.user.findMany({select:{createdAt:true}}),
 prisma.listingViewEvent.findMany({select:{listingId:true,createdAt:true},where:{createdAt:{gte:analyticsStart}},take:100000}),
 prisma.listingFavoriteEvent.findMany({select:{listingId:true,createdAt:true},where:{createdAt:{gte:analyticsStart}},take:100000}),
 prisma.chatConversation.findMany({select:{listingId:true,createdAt:true},where:{createdAt:{gte:analyticsStart},listingId:{not:null}},take:100000}),
 prisma.orderItem.findMany({select:{listingId:true,quantity:true,order:{select:{createdAt:true}}},where:{order:{createdAt:{gte:analyticsStart}}},take:100000})
 ]);
 const countMap=(rows:{listingId:string;count:number}[])=>Object.fromEntries(rows.map(r=>[r.listingId,r.count]));
 const orderMap=countMap(orders.map(r=>({listingId:r.listingId,count:r._sum.quantity??0})));
 const favoriteMap=countMap(favorites.map(r=>({listingId:r.listingId,count:r._count.id})));
 const viewMap=countMap(views.map(r=>({listingId:r.listingId,count:r._count.id})));
 const chatMap=countMap(conversations.filter((r):r is typeof r & {listingId:string}=>r.listingId!==null).map(r=>({listingId:r.listingId,count:r._count.id})));
 return <ModeratorPanel listings={listings.map(l=>({...l,createdAt:l.createdAt.toISOString(),orders:orderMap[l.id]??0,favorites:favoriteMap[l.id]??0,views:viewMap[l.id]??0,chats:chatMap[l.id]??0}))} reports={reports.map(r=>({...r,createdAt:r.createdAt.toISOString()}))} registrations={users.map(u=>u.createdAt.toISOString())} events={[
 ...viewEvents.map(e=>({listingId:e.listingId,date:e.createdAt.toISOString(),metric:"views" as const,value:1})),
 ...favoriteEvents.map(e=>({listingId:e.listingId,date:e.createdAt.toISOString(),metric:"favorites" as const,value:1})),
 ...chatEvents.filter((e):e is typeof e & {listingId:string}=>e.listingId!==null).map(e=>({listingId:e.listingId,date:e.createdAt.toISOString(),metric:"chats" as const,value:1})),
 ...orderEvents.map(e=>({listingId:e.listingId,date:e.order.createdAt.toISOString(),metric:"orders" as const,value:e.quantity}))
 ]}/>;
}
