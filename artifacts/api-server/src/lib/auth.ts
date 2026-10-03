import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import type { User } from "../honda-types";

const COOKIE_NAME = "rais_honda_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;
const SESSION_SECRET = process.env.SESSION_SECRET || (process.env.NODE_ENV === "production" ? "" : "local-development-only-secret-change-me");

export type AuthenticatedUser = Pick<User, "id" | "username" | "role" | "name" | "status" | "lastLogin">;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 7 || parts[0] !== "scrypt") return false;
  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
  try {
    const salt = Buffer.from(parts[4], "base64url");
    const expected = Buffer.from(parts[5], "base64url");
    const actual = crypto.scryptSync(password, salt, expected.length, { N: n, r, p });
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function isPasswordHash(value: string | undefined): boolean {
  return Boolean(value && value.startsWith("scrypt$"));
}

function sign(payload: string): string {
  if (!SESSION_SECRET) throw new Error("SESSION_SECRET must be configured in production.");
  return crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
}

function encodeSession(user: AuthenticatedUser): string {
  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    nonce: crypto.randomBytes(8).toString("hex"),
  })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decodeSession(value: string | undefined): { sub: string; exp: number } | null {
  if (!value || !SESSION_SECRET) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: string; exp?: number };
    if (!parsed.sub || !parsed.exp || parsed.exp <= Math.floor(Date.now() / 1000)) return null;
    return { sub: parsed.sub, exp: parsed.exp };
  } catch {
    return null;
  }
}

export function publicUser(user: User): AuthenticatedUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    status: user.status,
    lastLogin: user.lastLogin,
  };
}

export function setSessionCookie(res: Response, user: User): void {
  const isSecure = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  res.cookie(COOKIE_NAME, encodeSession(publicUser(user)), {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    maxAge: SESSION_TTL_SECONDS * 1000,
    path: "/",
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" || process.env.VERCEL === "1", path: "/" });
}

export function resolveSessionUser(req: Request, users: User[]): AuthenticatedUser | null {
  const session = decodeSession(req.cookies?.[COOKIE_NAME]);
  if (!session) return null;
  const user = users.find((candidate) => candidate.id === session.sub && candidate.status !== "Inactive");
  return user ? publicUser(user) : null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if ((req as RequestWithAuth).auth) return next();
  res.status(401).json({ success: false, error: "Authentication required.", code: "AUTH_REQUIRED" });
}

export type RequestWithAuth = Request & { auth?: AuthenticatedUser };

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const auth = (req as RequestWithAuth).auth;
    if (!auth) {
      res.status(401).json({ success: false, error: "Authentication required.", code: "AUTH_REQUIRED" });
      return;
    }
    if (!roles.includes(auth.role)) {
      res.status(403).json({ success: false, error: "You do not have permission for this operation.", code: "FORBIDDEN" });
      return;
    }
    next();
  };
}
