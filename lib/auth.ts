import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import EmailProvider from "next-auth/providers/email";
import { prisma } from "./prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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
        try {
          await resend.emails.send({
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
