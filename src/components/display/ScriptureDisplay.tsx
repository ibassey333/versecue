// ============================================
// Scripture Display View
// Full-screen projection display
// ============================================

'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { QueueItem } from '@/types';

interface ScriptureDisplayProps {
  scripture: QueueItem | null;
  theme?: 'dark' | 'light';
  showReference?: boolean;
  showTranslation?: boolean;
}

export function ScriptureDisplay({
  scripture,
  theme = 'dark',
  showReference = true,
  showTranslation = true,
}: ScriptureDisplayProps) {
  const isDark = theme === 'dark';
  
  return (
    <div
      className={cn(
        'relative w-full h-full min-h-screen flex items-center justify-center overflow-hidden',
        isDark ? 'bg-[#0a0a0a]' : 'bg-white'
      )}
    >
      {/* Subtle background texture */}
      <div 
        className={cn(
          'absolute inset-0 opacity-[0.015]',
          isDark ? 'bg-white' : 'bg-black'
        )}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Gradient overlay */}
      <div 
        className={cn(
          'absolute inset-0',
          isDark 
            ? 'bg-gradient-radial from-transparent via-transparent to-black/40'
            : 'bg-gradient-radial from-transparent via-transparent to-gray-100/60'
        )}
      />
      
      {/* Content */}
      <AnimatePresence mode="wait">
        {scripture ? (
          <motion.div
            key={scripture.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative z-10 max-w-5xl mx-auto px-12 py-16 text-center"
          >
            {/* Reference */}
            {showReference && (
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className={cn(
                  'font-display font-bold tracking-tight mb-8',
                  'text-5xl md:text-6xl lg:text-7xl',
                  isDark ? 'text-amber-400' : 'text-amber-600'
                )}
                style={{
                  textShadow: isDark 
                    ? '0 0 60px rgba(251, 191, 36, 0.3)' 
                    : 'none',
                }}
              >
                {scripture.reference.reference}
              </motion.h1>
            )}
            
            {/* Decorative line */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className={cn(
                'w-24 h-0.5 mx-auto mb-10',
                isDark ? 'bg-amber-400/30' : 'bg-amber-600/30'
              )}
            />
            
            {/* Verse text */}
            {scripture.verseText && (
              <motion.blockquote
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className={cn(
                  'font-scripture text-3xl md:text-4xl lg:text-5xl leading-relaxed',
                  isDark ? 'text-gray-100' : 'text-gray-800'
                )}
                style={{
                  fontStyle: 'italic',
                  textWrap: 'balance',
                }}
              >
                "{scripture.verseText}"
              </motion.blockquote>
            )}
            
            {/* Translation badge */}
            {showTranslation && scripture.translation && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.4 }}
                className={cn(
                  'mt-10 text-base font-body font-medium tracking-widest uppercase',
                  isDark ? 'text-gray-500' : 'text-gray-400'
                )}
              >
                — {scripture.translation} —
              </motion.p>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 text-center"
          >
            {/* VerseCue logo/branding when nothing displayed */}
            <motion.div
              animate={{ 
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className={cn(
                'font-display text-4xl font-bold tracking-tight',
                isDark ? 'text-gray-700' : 'text-gray-300'
              )}
            >
              VerseCue
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Corner branding (optional, can be toggled) */}
      <div 
        className={cn(
          'absolute bottom-4 right-4 text-xs font-body tracking-wide',
          isDark ? 'text-gray-800' : 'text-gray-200'
        )}
      >
        VerseCue
      </div>
    </div>
  );
}

// Standalone display page component with real-time updates
export function DisplayPage() {
  const [scripture, setScripture] = useState<QueueItem | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  // Listen for updates from main window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'DISPLAY_UPDATE') {
        setScripture(event.data.scripture);
      }
      if (event.data.type === 'CLEAR_DISPLAY') {
        setScripture(null);
      }
      if (event.data.type === 'SET_THEME') {
        setTheme(event.data.theme);
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    // Also check localStorage for cross-tab sync
    const checkStorage = () => {
      const stored = localStorage.getItem('versecue_display');
      if (stored) {
        try {
          const data = JSON.parse(stored);
          setScripture(data.scripture);
        } catch (e) {
          // Ignore
        }
      }
    };
    
    // Poll for updates (fallback for same-origin)
    const interval = setInterval(checkStorage, 500);
    checkStorage();
    
    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(interval);
    };
  }, []);
  
  // Listen for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setScripture(null);
        localStorage.setItem('versecue_display', JSON.stringify({ scripture: null }));
      }
      if (e.key === 't' || e.key === 'T') {
        setTheme(t => t === 'dark' ? 'light' : 'dark');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  return <ScriptureDisplay scripture={scripture} theme={theme} />;
}
