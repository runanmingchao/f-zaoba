import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";

let JWT_SECRET: Uint8Array | null = null;
function getJwtSecret(): Uint8Array {
  if (JWT_SECRET) return JWT_SECRET;
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET environment variable is required in production");
    }
    console.warn("AUTH_SECRET not set — using dev default (INSECURE, do not use in production)");
  }
  JWT_SECRET = new TextEncoder().encode(secret || "socratopia-dev-secret-change-in-production");
  return JWT_SECRET;
}
const COOKIE_NAME = "socratopia_session";

export interface Session {
  userId: string;
  email: string;
}

export async function createSession(userId: string, email: string) {
  const secret = getJwtSecret();
  const token = await new SignJWT({ userId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getSession(): Promise<Session | null> {
  const cookie = (await cookies()).get(COOKIE_NAME);
  if (!cookie) return null;

  try {
    const { payload } = await jwtVerify(cookie.value, getJwtSecret());
    return { userId: payload.userId as string, email: payload.email as string };
  } catch (err) {
    console.error("JWT verification failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function clearSession() {
  (await cookies()).delete(COOKIE_NAME);
}

function scryptAsync(password: string, salt: string, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = await scryptAsync(password, salt, 64);
  try {
    return timingSafeEqual(derived, Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}
