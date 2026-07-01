import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import EmailProvider from "next-auth/providers/email";
import { prisma } from "./prisma";
import { Resend } from "resend";

// Lazy initialization of Resend client
let resendClient: Resend | null = null;
const getResend = () => {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is required");
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
};

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: process.env.EMAIL_SERVER_PORT,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.RESEND_FROM_EMAIL || "noreply@grove-apiary.com",
      sendVerificationRequest: async ({ identifier: email, url }) => {
        // Development mode: log to console instead of sending email
        if (!process.env.RESEND_API_KEY || process.env.NODE_ENV === "development") {
          console.log("\n" + "=".repeat(60));
          console.log("📧 DEVELOPMENT MODE - Magic Link for:", email);
          console.log("=".repeat(60));
          console.log("🔗 Sign in URL:", url);
          console.log("=".repeat(60) + "\n");
          return;
        }

        // Production mode: send actual email
        try {
          await getResend().emails.send({
            from: process.env.RESEND_FROM_EMAIL || "Grove Apiary <noreply@grove-apiary.com>",
            to: email,
            subject: "Sign in to Grove Apiary",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #166534;">Welcome to Grove Apiary</h2>
                <p>Click the link below to sign in to your account:</p>
                <a href="${url}" style="display: inline-block; background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                  Sign In
                </a>
                <p style="color: #666; font-size: 14px;">
                  If you didn't request this email, you can safely ignore it.
                </p>
              </div>
            `,
          });
        } catch (error) {
          console.error("Error sending email:", error);
        }
      },
    }),
  ],
  callbacks: {
    session: async ({ session, token }) => {
      if (session?.user && token.sub) {
        (session.user as { id: string }).id = token.sub;
      }
      return session;
    },
    jwt: async ({ user, token }) => {
      if (user) {
        token.uid = user.id;
      }
      return token;
    },
    redirect: async ({ url, baseUrl }) => {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url;
      // Default to home page
      return baseUrl;
    },
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify",
    error: "/auth/error",
  },
};
