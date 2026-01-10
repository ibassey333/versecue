import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VerseCue',
  description: 'AI-Powered Scripture Detection',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
