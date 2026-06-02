import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { env } from "@/lib/env";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: "LaFamilia Mundial 2026 ⚽🌎",
  description:
    "Predict the World Cup. Compete with the community. See who becomes LaFamilia's top predictor.",
  openGraph: {
    title: "LaFamilia Mundial 2026 ⚽🌎",
    description:
      "Predict the tournament. Compete with the community. Takes under 2 minutes.",
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
