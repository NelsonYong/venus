/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";
const SALT_ROUNDS = 12;

export interface TokenPayload {
  userId: string;
  email: string;
}

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// JWT Token management
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

// Session management
export async function createSession(userId: string, userAgent?: string, ipAddress?: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const token = generateToken({ userId, email: user.email });

  const session = await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      userAgent,
      ipAddress,
      device: getUserDevice(userAgent),
    },
  });

  return { token, session };
}

export async function validateSession(token: string) {
  const session = await prisma.session.findUnique({
    where: { token },
    // @ts-ignore
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      // Clean up expired session
      await prisma.session.delete({ where: { id: session.id } });
    }
    return null;
  }

  return session;
}

export async function revokeSession(token: string) {
  await prisma.session.delete({ where: { token } });
}

// Helper function to extract device info
function getUserDevice(userAgent?: string): string | undefined {
  if (!userAgent) return undefined;

  if (userAgent.includes("Mobile")) return "Mobile";
  if (userAgent.includes("Tablet")) return "Tablet";
  return "Desktop";
}

// Validation schemas
export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export function validateRegisterData(data: any): data is RegisterData {
  return (
    typeof data.name === "string" &&
    data.name.trim().length >= 1 &&
    typeof data.email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) &&
    typeof data.password === "string" &&
    data.password.length >= 8
  );
}

export function validateLoginData(data: any): data is LoginData {
  return (
    typeof data.email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) &&
    typeof data.password === "string" &&
    data.password.length > 0
  );
}