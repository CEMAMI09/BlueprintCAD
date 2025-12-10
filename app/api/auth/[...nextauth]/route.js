import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getDb } from "../../../../db/db";
import { verifyPassword, generateToken } from "../../../../backend/lib/auth";

const handler = NextAuth({
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
          [isEmail ? credentials.identifier : null, !isEmail ? credentials.identifier : null]
        );

        if (!user) throw new Error("Invalid credentials");
        if (!user.password) throw new Error("Please sign in with your OAuth provider");

        const isValid = await verifyPassword(credentials.password, user.password);
        if (!isValid) throw new Error("Invalid credentials");

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.username,
          username: user.username,
          image: user.profile_picture || user.avatar,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username || user.name;
        token.email = user.email;
        token.picture = user.image;

        const forgeToken = generateToken(
          parseInt(user.id),
          user.username || user.name
        );
        token.forgeToken = forgeToken;
      }

      if (token.id) {
        try {
          const db = await getDb();
          const dbUser = await db.get(
            "SELECT tier FROM users WHERE id = ?",
            [token.id]
          );
          if (dbUser) token.tier = dbUser.tier || "free";
        } catch {
          token.tier = "free";
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.email = token.email;
        session.user.image = token.picture;
        session.user.tier = token.tier || "free";
        session.forgeToken = token.forgeToken;
      }

      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },

  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET,

  debug: process.env.NODE_ENV === "development",
});

export { handler as GET, handler as POST };