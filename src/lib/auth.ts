import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Admin",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const admin = await prisma.admin.findUnique({
          where: { email: credentials.email },
        });

        if (!admin) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          admin.passwordHash,
        );

        if (!isValid) {
          return null;
        }

        return {
          id: admin.id,
          email: admin.email,
          role: "admin",
        };
      },
    }),
    CredentialsProvider({
      name: "Subscriber",
      credentials: {
        email: { label: "Email", type: "email" },
        licenseKey: { label: "Code Premium", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.licenseKey) {
          return null;
        }

        const subscriber = await prisma.subscriber.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            premiumCode: true,
            isActive: true,
            expiresAt: true,
          },
        });

        if (!subscriber || !subscriber.premiumCode) {
          return null;
        }

        if (!subscriber.isActive) {
          return null;
        }

        const isValid = credentials.licenseKey === subscriber.premiumCode;

        if (!isValid) {
          return null;
        }

        return {
          id: subscriber.id,
          email: subscriber.email,
          role: "subscriber",
          isActive: subscriber.isActive,
          expiresAt: subscriber.expiresAt || undefined,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/connexion",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
