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
        if (!credentials?.identifier || !credentials?.password) return null;

        const db = await getDb();
        const isEmail = credentials.identifier.includes("@");

        const user = await db.get(
          "SELECT * FROM users WHERE email = ? OR username = ?",
          [isEmail ? credentials.identifier : null, !isEmail ? credentials.identifier : null]
        );

        if (!user || !user.password) return null;

        const isValid = await verifyPassword(credentials.password, user.password);
        if (!isValid) return null;

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

        token.forgeToken = generateToken(
          parseInt(user.id),
          user.username || user.name
        );
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id;
      session.user.username = token.username;
      session.user.email = token.email;
      session.user.image = token.picture;
      session.forgeToken = token.forgeToken;
      return session;
    },
  },

  session: {
    strategy: "jwt",
  },

  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };