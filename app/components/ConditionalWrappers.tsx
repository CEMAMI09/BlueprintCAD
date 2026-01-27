'use client';

import { usePathname } from 'next/navigation';
import { AuthProvider } from '../context/AuthContext';
import VerificationBanner from './VerificationBanner';
import PasswordGate from './PasswordGate';

export default function ConditionalWrappers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Don't wrap landing pages or home page with auth providers
  // Home page shows coming-soon which doesn't need password gate
  if (pathname === '/landingpage' || pathname === '/landingpage2' || pathname === '/') {
    return <>{children}</>;
  }
  
  return (
    <PasswordGate>
      <AuthProvider>
        <VerificationBanner />
        {children}
      </AuthProvider>
    </PasswordGate>
  );
}
