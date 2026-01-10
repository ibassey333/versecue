"use client";

import { useEffect, useState } from 'react';
import { QueueItem } from '@/types';
import { onDisplayMessage, getCurrentDisplay } from '@/lib/broadcast';

export default function DisplayPage() {
  const [scripture, setScripture] = useState<QueueItem | null>(null);
  
  useEffect(() => {
    // Get current display on load
    const current = getCurrentDisplay();
    if (current) {
      setScripture(current);
    }
    
    // Listen for updates
    const unsubscribe = onDisplayMessage((msg) => {
      if (msg.type === 'DISPLAY') {
        setScripture(msg.scripture);
      } else if (msg.type === 'CLEAR') {
        setScripture(null);
      }
    });
    
    // Keyboard shortcut to clear
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setScripture(null);
    };
    window.addEventListener('keydown', handleKey);
    
    return () => {
      unsubscribe();
      window.removeEventListener('keydown', handleKey);
    };
  }, []);
  
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-12">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-radial from-[#111820] to-[#0a0a0a]" />
      
      {scripture ? (
        <div className="relative z-10 text-center max-w-5xl mx-auto animate-fade-in">
          {/* Reference */}
          <h1 
            className="font-display text-6xl md:text-7xl lg:text-8xl font-bold text-amber-400 mb-8"
            style={{ textShadow: '0 0 60px rgba(251, 191, 36, 0.3)' }}
          >
            {scripture.reference.reference}
          </h1>
          
          {/* Divider */}
          <div className="w-32 h-0.5 mx-auto mb-10 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
          
          {/* Verse text */}
          {scripture.verseText && (
            <p className="font-serif text-3xl md:text-4xl lg:text-5xl text-gray-100 leading-relaxed italic">
              "{scripture.verseText}"
            </p>
          )}
          
          {/* Translation */}
          {scripture.translation && (
            <p className="mt-10 text-lg text-gray-500 uppercase tracking-widest">
              — {scripture.translation} —
            </p>
          )}
        </div>
      ) : (
        <div className="relative z-10 text-center">
          <div className="text-gray-700 font-display text-4xl tracking-tight animate-pulse">VerseCue</div>
          <p className="text-gray-800 text-sm mt-4">Waiting for scripture...</p>
        </div>
      )}
    </div>
  );
}
