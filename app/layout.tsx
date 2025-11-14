import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Image from "next/image";
import localFont from "next/font/local";
import clouds from '../public/clouds.png';

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Next.js and Supabase Starter Kit",
  description: "The fastest way to build apps with Next.js and Supabase",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <main className="min-h-screen flex flex-col items-center relative">
          {/* Background Image */}
          <div className="absolute inset-0 -z-10">
            <Image
              alt="Clouds background"
              src={clouds}
              placeholder="blur"
              quality={100}
              fill
              sizes="100vw"
              style={{
                objectFit: "cover",
              }}
              priority
            />
          </div>

          {/* Content */}
          {children}
        </main>
      </body>
    </html>
  );
}