import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      email: string;
      image?: string;
      name?: string;
      tier?: 'free' | 'pro' | 'team' | 'enterprise';
    };
    forgeToken?: string;
  }

  interface User {
    id: string;
    username: string;
    email: string;
    image?: string;
    name?: string;
    tier?: 'free' | 'pro' | 'team' | 'enterprise';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username: string;
    email: string;
    picture?: string;
    forgeToken?: string;
    tier?: 'free' | 'pro' | 'team' | 'enterprise';
  }
}
