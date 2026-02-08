import type { Metadata } from "next";
import "./globals.css";
import { AppHeader } from "@/components/layout/app-header";
import { Toaster } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "Chiron OS",
  description: "Local-first orchestration layer for autonomous AI teams",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen">
        <div className="flex flex-col h-screen">
          <AppHeader />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
