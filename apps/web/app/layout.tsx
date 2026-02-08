import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chiron OS",
  description: "Local-first orchestration layer for autonomous AI teams",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen">
        <div className="flex h-screen">
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
