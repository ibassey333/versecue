"use client";

import { useEffect, useState } from 'react';
import { QueueItem } from '@/types';
import { onDisplayMessage, getCurrentDisplay } from '@/lib/broadcast';

export default function DisplayPage() {
  const [scripture, setScripture] = useState<QueueItem | null>(null);
  
  useEffect(() => {
    const current = getCurrentDisplay();
    if (current) setScripture(current);
    
    const unsubscribe = onDisplayMessage((msg) => {
      if (msg.type === 'DISPLAY') setScripture(msg.scripture);
      else if (msg.type === 'CLEAR') setScripture(null);
    });
    
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
    <div className="min-h-screen bg-verse-bg flex items-center justify-center p-8">
      <div className="fixed inset-0 bg-gradient-to-br from-verse-bg via-verse-surface to-verse-bg" />
      
      {scripture ? (
        <div className="relative z-10 text-center max-w-5xl mx-auto animate-fade-in">
          <h1 
            className="font-display text-6xl md:text-7xl lg:text-8xl font-bold text-gold-400 mb-8"
            style={{ textShadow: '0 0 60px rgba(212, 175, 55, 0.3)' }}
          >
            {scripture.reference.reference}
          </h1>
          
          <div className="w-32 h-0.5 mx-auto mb-8 bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />
          
          {scripture.verseText && (
            <p className="font-scripture text-2xl md:text-3xl lg:text-4xl text-verse-text leading-relaxed italic px-8">
              "{scripture.verseText}"
            </p>
          )}
          
          {scripture.translation && (
            <p className="mt-8 text-lg text-verse-muted uppercase tracking-widest">
              — {scripture.translation} —
            </p>
          )}
        </div>
      ) : (
        <div className="relative z-10 text-center">
          <div className="text-verse-muted font-display text-5xl tracking-tight opacity-30">VerseCue</div>
          <p className="text-verse-subtle text-sm mt-4">Waiting for scripture...</p>
        </div>
      )}
    </div>
  );
}
