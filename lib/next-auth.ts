import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

// NextAuth v5 requires AUTH_SECRET or NEXTAUTH_SECRET
const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

if (!authSecret) {
  throw new Error(
    "Missing AUTH_SECRET or NEXTAUTH_SECRET environment variable. " +
    "Please set one of these in your .env file. " +
    "You can generate a secret by running: openssl rand -base64 32"
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env['GITHUB_CLIENT_ID']!,
      clientSecret: process.env['GITHUB_CLIENT_SECRET']!,
    }),
    Google({
      clientId: process.env['GOOGLE_CLIENT_ID']!,
      clientSecret: process.env['GOOGLE_CLIENT_SECRET']!,
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  secret: authSecret,
});
