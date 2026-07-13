import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MilePact Cofounder Contract Test",
  description: "Lean escrow contract test dashboard for technical cofounder evaluation"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
