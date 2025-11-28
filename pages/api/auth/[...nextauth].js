import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getDb } from '../../../db/db';
import { verifyPassword, generateToken } from '../../../shared/utils/auth.js';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        identifier: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          throw new Error('Please enter your credentials');
        }

        const db = await getDb();
        const isEmail = credentials.identifier.includes('@');

        const user = await db.get(
          'SELECT * FROM users WHERE email = ? OR username = ?',
          [isEmail ? credentials.identifier : null, !isEmail ? credentials.identifier : null]
        );

        if (!user) {
          throw new Error('Invalid credentials');
        }

        if (!user.password) {
          throw new Error('Please sign in with your OAuth provider');
        }

        const isValid = await verifyPassword(credentials.password, user.password);

        if (!isValid) {
          throw new Error('Invalid credentials');
        }

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.username,
          username: user.username,
          image: user.profile_picture || user.avatar,
        };
      }
    })
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || account.provider === 'credentials') {
        return true;
      }

      try {
        const db = await getDb();
        const provider = account.provider;
        const providerAccountId = account.providerAccountId;

        // Check if account is already linked
        const existingAccount = await db.get(
          'SELECT * FROM accounts WHERE provider = ? AND provider_account_id = ?',
          [provider, providerAccountId]
        );

        if (existingAccount) {
          // Account already exists, allow sign in
          return true;
        }

        // Check if user exists by email
        let dbUser = await db.get('SELECT * FROM users WHERE email = ?', [user.email]);

        if (dbUser) {
          // Link OAuth account to existing user
          console.log(`Linking ${provider} account to existing user:`, dbUser.username);
          
          // Update OAuth ID in users table
          const oauthIdColumn = provider === 'google' ? 'oauth_google_id' : 'oauth_github_id';
          await db.run(
            `UPDATE users SET ${oauthIdColumn} = ? WHERE id = ?`,
            [providerAccountId, dbUser.id]
          );

          // Update oauth_providers array
          let providers = [];
          try {
            providers = JSON.parse(dbUser.oauth_providers || '[]');
          } catch (e) {
            providers = [];
          }
          if (!providers.includes(provider)) {
            providers.push(provider);
            await db.run(
              'UPDATE users SET oauth_providers = ? WHERE id = ?',
              [JSON.stringify(providers), dbUser.id]
            );
          }

          // Create account record
          await db.run(
            `INSERT INTO accounts (user_id, type, provider, provider_account_id, access_token, expires_at, token_type, scope, id_token, refresh_token)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              dbUser.id,
              account.type,
              provider,
              providerAccountId,
              account.access_token,
              account.expires_at,
              account.token_type,
              account.scope,
              account.id_token,
              account.refresh_token
            ]
          );

          // Update user object with database ID
          user.id = dbUser.id.toString();
          user.username = dbUser.username;

          return true;
        } else {
          // Create new user from OAuth profile
          console.log(`Creating new user from ${provider} OAuth:`, user.email);

          // Generate unique username from email or name
          let username = user.email.split('@')[0];
          let usernameExists = await db.get('SELECT id FROM users WHERE username = ?', [username]);
          
          // Add numbers if username exists
          let counter = 1;
          while (usernameExists) {
            username = `${user.email.split('@')[0]}${counter}`;
            usernameExists = await db.get('SELECT id FROM users WHERE username = ?', [username]);
            counter++;
          }

          const oauthIdColumn = provider === 'google' ? 'oauth_google_id' : 'oauth_github_id';
          
          const result = await db.run(
            `INSERT INTO users (username, email, password, profile_picture, ${oauthIdColumn}, oauth_providers, created_at)
             VALUES (?, ?, NULL, ?, ?, ?, datetime('now'))`,
            [username, user.email, user.image, providerAccountId, JSON.stringify([provider])]
          );

          const userId = result.lastID;

          // Create account record
          await db.run(
            `INSERT INTO accounts (user_id, type, provider, provider_account_id, access_token, expires_at, token_type, scope, id_token, refresh_token)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              userId,
              account.type,
              provider,
              providerAccountId,
              account.access_token,
              account.expires_at,
              account.token_type,
              account.scope,
              account.id_token,
              account.refresh_token
            ]
          );

          // Update user object
          user.id = userId.toString();
          user.username = username;

          return true;
        }
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return false;
      }
    },

    async jwt({ token, user, account, trigger }) {
      // Initial sign in or refresh
      if (user) {
        token.id = user.id;
        token.username = user.username || user.name;
        token.email = user.email;
        token.picture = user.image;

        // Generate our custom JWT token for compatibility with existing system
        const forgeToken = generateToken(parseInt(user.id), user.username || user.name);
        token.forgeToken = forgeToken;
      }

      // Always fetch tier from database to ensure it's up to date
      if (token.id) {
        try {
          const db = await getDb();
          const dbUser = await db.get('SELECT tier FROM users WHERE id = ?', [token.id]);
          if (dbUser) {
            token.tier = dbUser.tier || 'free';
          }
        } catch (error) {
          console.error('Error fetching user tier:', error);
          token.tier = 'free';
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
        session.user.tier = token.tier || 'free';
        session.forgeToken = token.forgeToken;
      }

      return session;
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days (matching existing token expiry)
  },

  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET,

  debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions);
