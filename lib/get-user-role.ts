import { cookies } from "next/headers";
import { prisma } from "./prisma";

/**
 * Reads the better-auth session cookie, looks up the session + user in DB,
 * and returns the user's role or null.
 */
export async function getUserRole(): Promise<"admin" | "agent" | null> {
  try {
    const cookieStore = await cookies();

    // better-auth may use different cookie names depending on environment
    const rawToken =
      cookieStore.get("better-auth.session_token")?.value ??
      cookieStore.get("__Secure-better-auth.session_token")?.value;

    if (!rawToken) return null;

    // Cookie format is "token.signature" — extract just the token part
    const token = rawToken.split(".")[0];

    const session = await prisma.session.findUnique({
      where: { token },
      select: {
        expiresAt: true,
        user: { select: { role: true } },
      },
    });

    if (!session || session.expiresAt < new Date()) return null;

    return session.user.role as "admin" | "agent";
  } catch {
    return null;
  }
}
