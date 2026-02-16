import { headers } from "next/headers";
import { auth } from "./auth";
import { prisma } from "./prisma";

/**
 * Uses better-auth's getSession to authenticate, then looks up the user's role.
 */
export async function getUserRole(): Promise<"admin" | "agent" | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user) return null;

  return user.role as "admin" | "agent";
}
