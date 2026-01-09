import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import VerificationBanner from "./components/VerificationBanner";
import PasswordGate from "./components/PasswordGate";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "BlueprintCAD",
  description: "The home for CAD creators. Design, collaborate, and sell with CAD-native versioning, interactive previews, and built-in monetization.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="font-sans antialiased"
        style={{ backgroundColor: '#0E1116', color: '#E5E7EB' }}
      >
        <PasswordGate>
          <AuthProvider>
            <VerificationBanner />
            {children}
          </AuthProvider>
        </PasswordGate>
        <Analytics />
      </body>
    </html>
  );
}
