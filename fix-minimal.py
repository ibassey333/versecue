#!/usr/bin/env python3
"""
Fix hydration error - minimal test version
"""
import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path) if os.path.dirname(path) else '.', exist_ok=True)
    with open(path, 'w') as f:
        f.write(content)
    print(f"✅ Created: {path}")

LAYOUT = '''import type { Metadata } from 'next';
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
'''

MAIN_PAGE = '''"use client";

import { useState, useEffect } from 'react';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-verse-bg flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gold-400 mb-4">VerseCue</h1>
        <p className="text-verse-text">If you see this, hydration works!</p>
      </div>
    </div>
  );
}
'''

def main():
    print("=" * 60)
    print("Testing Minimal Version")
    print("=" * 60)
    
    write_file("src/app/layout.tsx", LAYOUT)
    write_file("src/app/page.tsx", MAIN_PAGE)
    
    print("\n" + "=" * 60)
    print("Done! Now:")
    print("  1. Stop server (Ctrl+C)")
    print("  2. Run: npm run dev")
    print("  3. Hard refresh: Cmd+Shift+R")
    print("=" * 60)

if __name__ == "__main__":
    main()
