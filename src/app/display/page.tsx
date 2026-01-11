"use client";

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useDisplayReceiver } from '@/hooks/useDisplaySync';

export default function DisplayPage() {
  const { currentDisplay, isConnected } = useDisplayReceiver();
  const [animate, setAnimate] = useState(false);
  
  // Trigger animation on change
  useEffect(() => {
    if (currentDisplay?.reference) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 500);
      return () => clearTimeout(timer);
    }
  }, [currentDisplay?.reference, currentDisplay?.verse_text]);
  
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
      {/* Connection indicator */}
      <div className="fixed top-4 right-4 flex items-center gap-2">
        <div className={cn(
          'w-2 h-2 rounded-full',
          isConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'
        )} />
        <span className="text-xs text-white/30">
          {isConnected ? 'Connected' : 'Connecting...'}
        </span>
      </div>
      
      {currentDisplay && currentDisplay.reference ? (
        <div className={cn(
          'max-w-4xl text-center transition-all duration-500',
          animate ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        )}>
          {/* Reference */}
          <h1 className="font-display text-5xl md:text-7xl font-bold text-amber-400 mb-8 tracking-wide">
            {currentDisplay.reference}
          </h1>
          
          {/* Verse Text */}
          {currentDisplay.verse_text && (
            <p className="font-scripture text-2xl md:text-4xl text-white leading-relaxed mb-8">
              "{currentDisplay.verse_text}"
            </p>
          )}
          
          {/* Translation */}
          <p className="text-lg text-white/50 uppercase tracking-widest">
            — {currentDisplay.translation} —
          </p>
        </div>
      ) : (
        <div className="text-center">
          <div className="text-6xl mb-6 opacity-20">📖</div>
          <h1 className="font-display text-3xl text-white/30 mb-2">VerseCue</h1>
          <p className="text-white/20">Waiting for scripture...</p>
        </div>
      )}
      
      {/* Branding */}
      <div className="fixed bottom-4 left-4 text-white/10 text-xs">
        VerseCue
      </div>
    </div>
  );
}
