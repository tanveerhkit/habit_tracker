import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Habit Tracker - Level Up",
  description: "Track your habits and level up your life with daily progress tracking",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Habit Tracker",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#00fff5" />
      </head>
      <body className={`${inter.variable} antialiased bg-background text-foreground selection:bg-neon-purple selection:text-white h-screen overflow-hidden`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
