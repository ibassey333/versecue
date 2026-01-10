// ============================================
// Full-Screen Display Page
// For projection output / OBS browser source
// ============================================

'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrentDisplay } from '@/stores/session';

export default function DisplayPage() {
  const currentDisplay = useCurrentDisplay();
  const [mounted, setMounted] = useState(false);
  
  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return (
      <div className="display-view">
        <div className="text-verse-muted text-lg">Loading...</div>
      </div>
    );
  }
  
  return (
    <div className="display-view">
      {/* Background gradient effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-gold-900/5 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-verse-bg to-transparent" />
      </div>
      
      {/* Main content */}
      <AnimatePresence mode="wait">
        {currentDisplay ? (
          <motion.div
            key={currentDisplay.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 flex flex-col items-center justify-center text-center max-w-5xl mx-auto"
          >
            {/* Scripture reference */}
            <motion.h1
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6, ease: 'easeOut' }}
              className="scripture-reference"
            >
              {currentDisplay.reference.reference}
            </motion.h1>
            
            {/* Decorative divider */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="w-32 h-0.5 bg-gradient-to-r from-transparent via-gold-500/50 to-transparent mb-8"
            />
            
            {/* Verse text */}
            {currentDisplay.verseText && (
              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6, ease: 'easeOut' }}
                className="scripture-text"
              >
                "{currentDisplay.verseText}"
              </motion.p>
            )}
            
            {/* Translation */}
            {currentDisplay.translation && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="scripture-translation"
              >
                — {currentDisplay.translation} —
              </motion.span>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 flex flex-col items-center justify-center text-center"
          >
            {/* Empty state - subtle branding */}
            <motion.div
              animate={{ 
                opacity: [0.1, 0.2, 0.1],
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className="flex flex-col items-center"
            >
              <svg
                className="w-16 h-16 text-gold-500/20 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <span className="text-gold-500/20 font-display text-2xl tracking-wider">
                VerseCue
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* OBS-friendly: No UI elements when content is displayed */}
      {!currentDisplay && (
        <div className="fixed bottom-4 left-4 text-xs text-verse-muted/30">
          Waiting for scripture...
        </div>
      )}
    </div>
  );
}
