'use client';

import { usePathname } from 'next/navigation';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import PasswordGate from './PasswordGate';

export default function ConditionalWrappers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Public marketing + auth entry pages bypass the gate entirely
  const publicBypass =
    pathname === '/' ||
    pathname === '/landingpage' ||
    pathname === '/landingpage2' ||
    pathname === '/login' ||
    pathname === '/register';

  if (publicBypass) {
    return <ThemeProvider>{children}</ThemeProvider>;
  }
  
  return (
    <ThemeProvider>
      <PasswordGate>
        <AuthProvider>
          {children}
        </AuthProvider>
      </PasswordGate>
    </ThemeProvider>
  );
}
