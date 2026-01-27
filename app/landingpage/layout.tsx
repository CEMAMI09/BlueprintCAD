import type { Metadata } from "next";
import "../globals.css";
import "./landing-page.css";

export const metadata: Metadata = {
  title: "BlueprintCAD - The Future of CAD Collaboration",
  description: "Real-time 3D collaboration, version control, and analytics for engineering teams. Built for the modern web.",
};

// Landing page layout - just wraps children without auth/providers
export default function LandingPageLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
