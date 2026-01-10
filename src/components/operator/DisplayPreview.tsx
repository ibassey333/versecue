// ============================================
// Display Preview Component
// Shows what's currently being projected
// ============================================

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, ExternalLink, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrentDisplay, useSessionStore } from '@/stores/session';

interface DisplayPreviewProps {
  className?: string;
}

export function DisplayPreview({ className }: DisplayPreviewProps) {
  const currentDisplay = useCurrentDisplay();
  const { clearDisplay } = useSessionStore();
  
  const openDisplayWindow = () => {
    window.open('/display', 'VerseCue Display', 'width=1280,height=720');
  };
  
  return (
    <div className={cn(
      'rounded-xl border border-verse-border bg-verse-surface overflow-hidden',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-verse-border">
        <div className="flex items-center gap-3">
          <Monitor className="w-4 h-4 text-gold-500" />
          <h3 className="font-body text-sm font-semibold text-verse-text tracking-wide uppercase">
            Display Preview
          </h3>
        </div>
        <button
          onClick={openDisplayWindow}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs',
            'bg-verse-border/50 text-verse-subtle hover:text-verse-text',
            'hover:bg-verse-border transition-colors'
          )}
        >
          <ExternalLink className="w-3 h-3" />
          <span>Open Window</span>
        </button>
      </div>
      
      {/* Preview area - 16:9 aspect ratio */}
      <div className="relative aspect-video bg-verse-bg">
        <AnimatePresence mode="wait">
          {currentDisplay ? (
            <motion.div
              key={currentDisplay.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
            >
              {/* Reference */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="font-display text-2xl font-bold text-gold-400 mb-4"
              >
                {currentDisplay.reference.reference}
              </motion.h2>
              
              {/* Verse text */}
              {currentDisplay.verseText && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="font-scripture text-base text-verse-text/90 leading-relaxed max-w-lg"
                >
                  "{currentDisplay.verseText}"
                </motion.p>
              )}
              
              {/* Translation badge */}
              {currentDisplay.translation && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4 text-[10px] font-medium text-verse-muted uppercase tracking-wider"
                >
                  {currentDisplay.translation}
                </motion.span>
              )}
              
              {/* Clear button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                onClick={clearDisplay}
                className={cn(
                  'absolute top-4 right-4 p-2 rounded-lg',
                  'bg-verse-elevated/80 text-verse-muted hover:text-verse-text',
                  'hover:bg-verse-elevated transition-colors'
                )}
              >
                <X className="w-4 h-4" />
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
              <div className="w-16 h-16 rounded-full bg-verse-elevated flex items-center justify-center mb-4">
                <Monitor className="w-8 h-8 text-verse-muted" />
              </div>
              <p className="text-verse-subtle text-sm">Nothing displayed</p>
              <p className="text-verse-muted text-xs mt-1">
                Approve and display a scripture to see it here
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Aspect ratio indicator */}
        <div className="absolute bottom-2 right-2 text-[9px] text-verse-muted/50 font-mono">
          16:9
        </div>
      </div>
      
      {/* Keyboard hint */}
      <div className="px-5 py-3 border-t border-verse-border bg-verse-bg/50">
        <p className="text-[11px] text-verse-muted text-center">
          Press <kbd className="px-1.5 py-0.5 rounded bg-verse-border font-mono text-[10px]">Esc</kbd> to clear display
        </p>
      </div>
    </div>
  );
}
