import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import { getUserByEmail } from "./data/user";
import bcrypt from "bcryptjs";

// Determine if the code is running in middleware/edge context
const isEdgeRuntime =
  typeof process.env.NEXT_RUNTIME === "string" &&
  process.env.NEXT_RUNTIME === "edge";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await getUserByEmail(credentials.email);

        if (!user || !user.password) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (passwordMatch) {
          return user;
        }

        return null;
      },
    }),
  ],
  // Only use Prisma adapter in non-edge environments
  adapter: isEdgeRuntime ? undefined : PrismaAdapter(prisma),
  // Use JWT session strategy which is compatible with Edge
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/sign-in", // Changed from "/login" to "/sign-in"
  },
  callbacks: {
    // Add any necessary callbacks here
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        // Add any other user properties you need
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session?.user) {
        session.user.id = token.id as string;
        // Copy any other properties from token to session
      }
      return session;
    },
    redirect({ url, baseUrl }) {
      console.log("Auth redirect called:", { url, baseUrl });

      // Simple rule: Always go to dashboard after successful login
      if (
        url === baseUrl ||
        url.includes("/sign-in") ||
        url === `${baseUrl}/`
      ) {
        console.log("Redirecting to dashboard");
        return `${baseUrl}/dashboard`;
      }

      // If URL starts with baseUrl, allow it
      if (url.startsWith(baseUrl)) {
        return url;
      }

      // Default to baseUrl
      return baseUrl;
    },
  },
});
