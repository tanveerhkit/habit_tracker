import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Habitly — A calmer way to build consistency',
  description: 'A minimal habit tracker for small daily progress.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Habitly',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
