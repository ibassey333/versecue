import type { Metadata } from 'next';
import { Inter, Playfair_Display, Crimson_Pro } from 'next/font/google';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-body',
});

const playfair = Playfair_Display({ 
  subsets: ['latin'],
  variable: '--font-display',
});

const crimson = Crimson_Pro({
  subsets: ['latin'],
  variable: '--font-scripture',
});

export const metadata: Metadata = {
  title: 'VerseCue - Real-time Scripture Detection',
  description: 'AI-powered scripture detection for church worship services. The right verse, right on time.',
  keywords: ['church', 'worship', 'scripture', 'bible', 'projection', 'media'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${crimson.variable}`}>
      <body className="font-body">{children}</body>
    </html>
  );
}
