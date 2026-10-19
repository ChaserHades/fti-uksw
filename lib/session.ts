// lib/session.ts
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "fallback-dev-secret-change-in-prod"
);
const COOKIE = "fti_session";

export interface SessionPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  statusVerifikasi: string;
  mustChangePassword: boolean;
  sessionVersion: number;
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, SECRET, { algorithms: ["HS256"] });
    if (typeof payload.id !== "string" || !payload.id || typeof payload.exp !== "number") return null;
    if (typeof payload.sessionVersion !== "number" || !Number.isSafeInteger(payload.sessionVersion) || payload.sessionVersion < 0) return null;

    // JWT establishes identity; current account permissions come from the database.
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        statusVerifikasi: true,
        mustChangePassword: true,
        sessionVersion: true,
      },
    });
    if (!user || user.sessionVersion !== payload.sessionVersion) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name ?? "",
      role: user.role,
      statusVerifikasi: user.statusVerifikasi,
      mustChangePassword: user.mustChangePassword,
      sessionVersion: user.sessionVersion,
    };
  } catch {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE);
}
