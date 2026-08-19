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

const themeScript = `(() => { try { const stored = localStorage.getItem('habit-tracker:theme'); const dark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches; if (dark) document.documentElement.classList.add('dark'); } catch {} })()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>{children}</body>
    </html>
  );
}
