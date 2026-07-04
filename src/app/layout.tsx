import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/providers/app-provider";

const displayFont = Inter({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HealthManager CRM Medico",
  description: "CRM medico SaaS para clinicas, agenda e financeiro.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${displayFont.variable} h-full`}
    >
      <body className="h-full text-[var(--ink)] antialiased">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}

