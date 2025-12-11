import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getDb } from "@/db/db";
import { verifyPassword, generateToken } from "@/backend/lib/auth";

const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          throw new Error("Please enter your credentials");
        }

        const db = await getDb();
        const isEmail = credentials.identifier.includes("@");

        const user = await db.get(
          "SELECT * FROM users WHERE email = ? OR username = ?",
          [
            isEmail ? credentials.identifier : null,
            !isEmail ? credentials.identifier : null
          ]
        );

        if (!user) throw new Error("Invalid credentials");
        if (!user.password)
          throw new Error("Please sign in with your OAuth provider");

        const valid = await verifyPassword(credentials.password, user.password);
        if (!valid) throw new Error("Invalid credentials");

        return {
          id: user.id.toString(),
          email: user.email,
          username: user.username,
          image: user.profile_picture || user.avatar,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.username = user.username;
        token.image = user.image;

        token.forgeToken = generateToken(parseInt(user.id), user.username);
      }

      // fetch tier
      if (token.id) {
        try {
          const db = await getDb();
          const dbUser = await db.get(
            "SELECT tier FROM users WHERE id = ?",
            [token.id]
          );
          token.tier = dbUser?.tier || "free";
        } catch {
          token.tier = "free";
        }
      }

      return token;
    },

    async session({ session, token }) {
      session.user = {
        id: token.id,
        email: token.email,
        username: token.username,
        image: token.image,
        tier: token.tier || "free",
      };

      session.forgeToken = token.forgeToken;
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };