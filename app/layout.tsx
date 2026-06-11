import type { Metadata } from "next";
import "./globals.css";
import ConditionalWrappers from "./components/ConditionalWrappers";
import ThemeScript from "./components/ThemeScript";
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
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Bungee&family=Mona+Sans:ital,wght@0,200..900;1,200..900&family=Montserrat:ital,wght@0,100..900;1,100..900&family=Paytone+One&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased">
        <ConditionalWrappers>
          {children}
        </ConditionalWrappers>
        <Analytics />
      </body>
    </html>
  );
}
