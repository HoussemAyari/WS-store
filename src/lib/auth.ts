import { jwtVerify, SignJWT } from "jose";

export type SessionPayload = {
  role: "shop" | "depot";
  shop: string;
  profileId?: string;
};

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET doit contenir au moins 32 caractères.");
  }
  return new TextEncoder().encode(value);
}

export async function createSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("365d")
    .sign(secret());
}

export async function readSession(token?: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.role !== "shop" && payload.role !== "depot") return null;
    if (typeof payload.shop !== "string") return null;
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
