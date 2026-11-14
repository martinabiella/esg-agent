import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Monitoraggio normativa ESG",
  description: "Monitoraggio della normativa di sostenibilità UE e Italia",
};

const voci = [
  { href: "/normative", label: "Normative" },
  { href: "/settori", label: "Settori" },
  { href: "/clienti", label: "Clienti" },
  { href: "/notizie", label: "Notizie" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b px-6 py-3 flex items-center gap-6">
          <Link href="/" className="font-semibold">
            Monitoraggio ESG
          </Link>
          <nav className="flex gap-4 text-sm">
            {voci.map((v) => (
              <Link key={v.href} href={v.href} className="hover:underline">
                {v.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="flex-1 px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
