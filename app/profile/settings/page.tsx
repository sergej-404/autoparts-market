import {RecentlyViewed} from "@/components/history/RecentlyViewed";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileSettings } from "./ProfileSettings";

export default async function ProfileSettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      phone: true,
      image: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) redirect("/login");

  const [totalListings, publishedListings, favoritesReceived, notificationPreferences] = await Promise.all([
    prisma.listing.count({ where: { createdById: user.id } }),
    prisma.listing.count({ where: { createdById: user.id, status: "PUBLISHED" } }),
    prisma.listingFavoriteEvent.count({ where: { listing: { createdById: user.id } } }),
    prisma.notificationPreference.findUnique({
      where: { userId: user.id },
      select: { site: true, orders: true, messages: true },
    }),
  ]);

  const recentListings = await prisma.listing.findMany({where:{status:{in:["PUBLISHED","OUT_OF_STOCK"]}},include:{make:true,model:true,category:true},orderBy:{createdAt:"desc"}});
  return (
    <>
    <ProfileSettings
      stats={{ totalListings, publishedListings, favoritesReceived }}
      notificationPreferences={notificationPreferences ?? { site: true, orders: true, messages: true }}
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        phone: user.phone,
        image: user.image,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      }}
    />
    <RecentlyViewed listings={recentListings}/>
    </>
  );
}
