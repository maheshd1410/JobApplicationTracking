import type { Metadata } from "next";
import { Space_Grotesk, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { AuthGate } from "@/components/AuthGate";
import { AuthStatus } from "@/components/AuthStatus";

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
        <AuthGate>
          <header className="px-6 py-4 md:px-10">
            <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-[var(--line)] bg-white/80 px-6 py-3 text-sm shadow-[var(--shadow)]">
              <span className="text-xs uppercase tracking-[0.3em] text-[var(--accent-2)]">
                Job Application Tracker
              </span>
              <div className="flex items-center gap-4 text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
                <a href="/">Dashboard</a>
                <a href="/opportunities">Opportunities</a>
                <a href="/inventory">Daily Inventory</a>
                <a href="/todos">Daily To-Do</a>
                <a href="/performance">Performance</a>
                <a
                  className="rounded-full bg-[var(--accent-2)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white"
                  href="/opportunities"
                >
                  Add Opportunity
                </a>
              </div>
              <AuthStatus />
            </nav>
          </header>
          {children}
        </AuthGate>
        <footer className="px-6 pb-8 md:px-10">
          <div className="mx-auto max-w-6xl text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
            Build {process.env.NEXT_PUBLIC_APP_VERSION?.slice(0, 7) ?? "local"}
          </div>
        </footer>
      </body>
    </html>
  );
}

