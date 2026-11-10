import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type UserRole = "USER" | "MODERATOR" | "ADMIN";

type CurrentPrincipal = {
  id: string;
  role: UserRole;
};

const roleRank: Record<UserRole, number> = {
  USER: 0,
  MODERATOR: 1,
  ADMIN: 2,
};

function isUserRole(value: unknown): value is UserRole {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(roleRank, value)
  );
}

/** Always read the current role from the database, not from client input. */
export async function getCurrentPrincipal(): Promise<CurrentPrincipal | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  if (!user || !isUserRole(user.role)) return null;

  return { id: user.id, role: user.role };
}

export async function requireRole(minimumRole: UserRole): Promise<CurrentPrincipal> {
  const principal = await getCurrentPrincipal();
  if (!principal) redirect("/login");
  if (roleRank[principal.role] < roleRank[minimumRole]) redirect("/");
  return principal;
}
