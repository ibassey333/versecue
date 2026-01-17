import type { Metadata } from "next";
import { Inter, Playfair_Display, Crimson_Pro } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const playfair = Playfair_Display({ 
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const crimsonPro = Crimson_Pro({ 
  subsets: ["latin"],
  variable: "--font-scripture",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VerseCue - The Right Verse, Right On Time",
  description: "AI-powered scripture detection and display for churches. Automatically detect Bible references during sermons and display them beautifully for your congregation.",
  keywords: ["church software", "scripture display", "sermon tools", "Bible verses", "church technology"],
  authors: [{ name: "VerseCue" }],
  openGraph: {
    title: "VerseCue - The Right Verse, Right On Time",
    description: "AI-powered scripture detection and display for churches",
    url: "https://versecue.app",
    siteName: "VerseCue",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VerseCue - The Right Verse, Right On Time",
    description: "AI-powered scripture detection and display for churches",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${crimsonPro.variable}`}>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
