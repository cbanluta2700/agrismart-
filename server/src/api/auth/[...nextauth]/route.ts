import NextAuth from "next-auth";
import type { NextAuthConfig, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import GithubProvider from "next-auth/providers/github";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { AuthErrorCode } from "@/lib/types/auth";
import { generateAccessToken, generateRefreshToken } from "@/lib/auth/token";

// The base user type that matches NextAuth's requirements
type AuthUser = User & {
  role: string;
  accountLevel: string;
  status: string;
  twoFactorEnabled: boolean;
  isVerified: boolean;
  accessToken: string;
  refreshToken: string;
};

export const options = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await db.user.findUnique({
            where: { email: credentials.email },
            select: {
              id: true,
              email: true,
              name: true,
              password: true,
              role: true,
              isVerified: true,
              status: true,
              image: true,
            },
          });

          if (!user) {
            return null;
          }

          const isValid = await compare(credentials.password, user.password);
          if (!isValid) {
            return null;
          }

          if (!user.isVerified) {
            throw new Error(AuthErrorCode.EMAIL_NOT_VERIFIED);
          }

          if (user.status === "suspended") {
            throw new Error(AuthErrorCode.ACCOUNT_SUSPENDED);
          }

          // Generate tokens
          const accessToken = generateAccessToken({
            userId: user.id,
            email: user.email,
            role: user.role
          });
          
          const refreshToken = generateRefreshToken({
            userId: user.id
          });

          // Return user data with required fields
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            accountLevel: "basic",
            status: user.status,
            twoFactorEnabled: false,
            isVerified: user.isVerified,
            accessToken,
            refreshToken,
          } as AuthUser;
        } catch (error) {
          console.error("[AUTH_ERROR]", error);
          return null;
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!
    }),
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Allow OAuth sign-in without email verification
      if (account?.provider !== "credentials") {
        return true;
      }
      
      return true;
    },
    async jwt({ token, user, account, profile, trigger }) {
      // Initial sign in
      if (user) {
        // When using credentials provider
        if (user.accessToken && user.refreshToken) {
          token.accessToken = user.accessToken;
          token.refreshToken = user.refreshToken;
        }

        return {
          ...token,
          role: user.role,
          accountLevel: user.accountLevel,
          status: user.status,
          twoFactorEnabled: user.twoFactorEnabled,
          isVerified: user.isVerified,
        };
      }

      // Handle token refresh if it's expired
      const currentTime = Math.floor(Date.now() / 1000);
      const accessTokenExpiry = token.exp as number;

      if (currentTime > accessTokenExpiry) {
        try {
          // This would be where you'd implement token refresh logic
          // For now, we'll leave it as is since it depends on your backend implementation
          console.log("Token has expired, would refresh here");
        } catch (error) {
          console.error("Failed to refresh token", error);
          return { ...token, error: "RefreshAccessTokenError" };
        }
      }

      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub!,
          role: token.role as string,
          accountLevel: token.accountLevel as string,
          status: token.status as string,
          twoFactorEnabled: Boolean(token.twoFactorEnabled),
          isVerified: Boolean(token.isVerified),
          accessToken: token.accessToken as string,
          refreshToken: token.refreshToken as string,
        },
        error: token.error,
      };
    },
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      // Create user in the database if signing in with OAuth and user doesn't exist
      if (account?.provider !== "credentials" && isNewUser) {
        try {
          await db.user.upsert({
            where: { email: user.email! },
            update: {
              name: user.name!,
              image: user.image,
              isVerified: true, // Auto-verify OAuth users
            },
            create: {
              email: user.email!,
              name: user.name!,
              image: user.image,
              password: "", // OAuth users don't need a password
              role: "USER",
              isVerified: true,
              status: "active",
            },
          });
          console.log(`Created new user from ${account.provider} OAuth`);
        } catch (error) {
          console.error("Error creating user from OAuth", error);
        }
      }
    },
    async signOut({ session, token }) {
      // Add any logout cleanup here if needed
    },
  },
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/logout",
    error: "/auth/error",
    verifyRequest: "/auth/verify-email",
    newUser: "/auth/register",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
} satisfies NextAuthConfig;

const handler = NextAuth(options);
export { handler as GET, handler as POST };
export const config = options;