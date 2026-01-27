import type { Metadata } from "next";
import "../globals.css";
import "./landing-page2.css";

export const metadata: Metadata = {
  title: "BlueprintCAD - The Future of CAD Collaboration",
  description: "Real-time 3D collaboration, version control, and analytics for engineering teams. Built for the modern web.",
};

export default function LandingPage2Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
