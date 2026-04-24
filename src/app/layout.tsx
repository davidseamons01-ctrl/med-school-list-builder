import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { Nav } from "@/components/Nav";
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
  title: "MD school list builder",
  description: "Plan US MD applications with source-tracked facts and transparent fit scoring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="stylesheet" href="https://js.arcgis.com/4.32/esri/themes/dark/main.css" />
      </head>
      <body className="flex min-h-full flex-col bg-slate-950 text-slate-50">
        <Script src="https://js.arcgis.com/4.32/" strategy="afterInteractive" />
        <Nav />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-white/10 px-4 py-6 text-center text-xs text-slate-500">
          Research planner only. Verify every number with primary sources, especially school websites and AAMC publications.
        </footer>
      </body>
    </html>
  );
}
