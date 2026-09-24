import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: 'CODING CLUB CHAOS ⚡',
  description:
    'THINK FAST. BID SMARTER. Live competitive coding exam platform featuring MCQ Round 1 and Code Auction Round 2.',
  keywords: ['coding club chaos', 'competitive exam', 'MCQ sprint', 'code auction', 'bidding', 'college hackathon'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-background">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@600;700&family=Outfit:wght@700;800;900&family=Plus+Jakarta+Sans:wght@500;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background font-body-md text-on-surface min-h-screen flex flex-col selection:bg-secondary-container selection:text-on-surface">
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '14px',
              borderRadius: '12px',
              border: '2px solid #131b2e',
              boxShadow: '4px 4px 0px #131b2e',
            },
          }}
        />
        <Analytics />
      </body>
    </html>
  );
}
