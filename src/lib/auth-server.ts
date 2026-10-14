import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export async function getCurrentSession() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export async function hasPremiumAccess() {
  const session = await getCurrentSession();
  if (!session) return false;
  if (session.user.role === "admin") return true;
  const { getPrisma } = await import("@/lib/prisma");
  const member = await getPrisma().subscriber.findUnique({
    where: { id: session.user.id },
  });
  return Boolean(
    member?.isActive && (!member.expiresAt || member.expiresAt > new Date()),
  );
}
