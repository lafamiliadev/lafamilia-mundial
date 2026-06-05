import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { PreviewMount } from "@/components/PreviewMount";
import { StatusBar } from "@/components/StatusBar";
import { env } from "@/lib/env";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: "La Copa de LaFamilia 2026 ⚽🌎",
  description:
    "Predict. Compete. Brag forever. The World Cup prediction game for the LaFamilia community.",
  openGraph: {
    title: "La Copa de LaFamilia 2026 ⚽🌎",
    description: "Predict. Compete. Brag forever. Takes a few minutes.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <StatusBar />
        </Suspense>
        {children}
        <Suspense fallback={null}>
          <PreviewMount />
        </Suspense>
      </body>
    </html>
  );
}
