import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI-SE · Engineering Control Center",
  description: "Autonomous AI software engineering organization control plane",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <ScrollProgress className="from-violet-500 via-indigo-400 to-cyan-400" />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
