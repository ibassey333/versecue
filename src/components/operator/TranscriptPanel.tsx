// ============================================
// Transcript Panel Component
// Shows live transcription with detected highlights
// ============================================

'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTranscript, useInterimTranscript, useIsListening, useIsPaused } from '@/stores/session';

interface TranscriptPanelProps {
  className?: string;
}

export function TranscriptPanel({ className }: TranscriptPanelProps) {
  const transcript = useTranscript();
  const interimTranscript = useInterimTranscript();
  const isListening = useIsListening();
  const isPaused = useIsPaused();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, interimTranscript]);
  
  return (
    <div className={cn(
      'flex flex-col rounded-xl border border-verse-border bg-verse-surface',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-verse-border">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-2.5 h-2.5 rounded-full',
            isListening && !isPaused ? 'bg-status-listening animate-pulse-gentle' : 'bg-verse-muted'
          )} />
          <h3 className="font-body text-sm font-semibold text-verse-text tracking-wide uppercase">
            Live Transcript
          </h3>
        </div>
        {isPaused && (
          <span className="text-xs font-medium text-status-paused bg-status-paused/10 px-2 py-1 rounded-full">
            Paused
          </span>
        )}
      </div>
      
      {/* Transcript content */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 min-h-[200px] max-h-[400px] scroll-smooth"
      >
        {transcript.length === 0 && !interimTranscript ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="text-4xl mb-4 opacity-50">🎤</div>
            <p className="text-verse-subtle text-sm">
              {isListening 
                ? 'Listening for speech...' 
                : 'Click "Start Listening" to begin transcription'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <AnimatePresence mode="popLayout">
              {transcript.map((segment) => (
                <motion.span
                  key={segment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-verse-text font-body text-[15px] leading-relaxed"
                >
                  {segment.text}{' '}
                </motion.span>
              ))}
            </AnimatePresence>
            
            {/* Interim (in-progress) transcript */}
            {interimTranscript && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                className="text-verse-subtle font-body text-[15px] leading-relaxed italic"
              >
                {interimTranscript}
              </motion.span>
            )}
          </div>
        )}
      </div>
      
      {/* Footer with stats */}
      <div className="px-5 py-3 border-t border-verse-border bg-verse-bg/50 rounded-b-xl">
        <div className="flex items-center justify-between text-xs text-verse-subtle">
          <span>{transcript.length} segments</span>
          <span className="font-mono">
            {transcript.reduce((acc, s) => acc + s.text.length, 0)} characters
          </span>
        </div>
      </div>
    </div>
  );
}
