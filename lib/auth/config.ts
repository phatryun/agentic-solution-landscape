import NextAuth from "next-auth";
import Cognito from "next-auth/providers/cognito";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db/client";
import type { Role } from "@prisma/client";

// Google logins are federated through Cognito only.
// Do NOT add a direct Google NextAuth provider — it would create duplicate
// accounts for the same user (one via Cognito, one via direct OAuth).

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    Cognito({
      clientId: process.env.COGNITO_CLIENT_ID!,
      clientSecret: process.env.COGNITO_CLIENT_SECRET!,
      issuer: process.env.COGNITO_ISSUER!,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // On first sign-in, load user role from DB and store in token
        token.userId = user.id;
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        token.role = dbUser?.role ?? "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
});

// Type augmentation for session
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
