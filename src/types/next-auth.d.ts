import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      role: string;
      isActive?: boolean;
      expiresAt?: Date;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    isActive?: boolean;
    expiresAt?: Date;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    isActive?: boolean;
    expiresAt?: Date;
  }
}
