import type { Metadata } from "next";
import { Space_Grotesk, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Job Application Tracker",
  description: "Inventory and manage job applications in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${sourceSerif.variable}`}>
        <header className="px-6 py-4 md:px-10">
          <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-[var(--line)] bg-white/80 px-6 py-3 text-sm shadow-[var(--shadow)]">
            <span className="text-xs uppercase tracking-[0.3em] text-[var(--accent-2)]">
              Job Application Tracker
            </span>
            <div className="flex items-center gap-4 text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
              <a href="/">Dashboard</a>
              <a href="/opportunities">Opportunities</a>
              <a href="/inventory">Daily Inventory</a>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
