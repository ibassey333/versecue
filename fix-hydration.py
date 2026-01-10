#!/usr/bin/env python3
"""
Fix hydration error in VerseCue
"""
import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path) if os.path.dirname(path) else '.', exist_ok=True)
    with open(path, 'w') as f:
        f.write(content)
    print(f"✅ Created: {path}")

MAIN_PAGE = '''"use client";

import { useRef, useCallback, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Keyboard, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/stores/session';
import { useKeyboardShortcuts, SHORTCUTS } from '@/hooks/useKeyboardShortcuts';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { detectScriptures } from '@/lib/detection';
import { TranscriptSegment } from '@/types';

// Components
import { TranscriptPanel } from '@/components/operator/TranscriptPanel';
import { DetectionQueue } from '@/components/operator/DetectionQueue';
import { ApprovedQueue } from '@/components/operator/ApprovedQueue';
import { DisplayPreview } from '@/components/operator/DisplayPreview';
import { ManualSearch } from '@/components/operator/ManualSearch';
import { AudioControls } from '@/components/operator/AudioControls';
import { SessionStats } from '@/components/operator/SessionStats';
import { ExportPanel } from '@/components/operator/ExportPanel';

export default function OperatorDashboard() {
  const [mounted, setMounted] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const {
    isListening,
    isPaused,
    settings,
    addDetection,
    addTranscriptSegment,
    setInterimTranscript,
    setAudioLevel: setStoreAudioLevel,
  } = useSessionStore();
  
  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Process transcript segments for detection
  const handleTranscript = useCallback(async (segment: TranscriptSegment) => {
    addTranscriptSegment(segment);
    
    // Skip detection if paused
    if (isPaused) return;
    
    // Run detection pipeline
    const detections = await detectScriptures(segment.text, {
      fetchVerses: true,
    });
    
    // Add each detection to the queue
    for (const detection of detections) {
      addDetection(detection);
    }
  }, [addDetection, addTranscriptSegment, isPaused]);
  
  // Handle interim (in-progress) transcript
  const handleInterim = useCallback((text: string) => {
    setInterimTranscript(text);
  }, [setInterimTranscript]);
  
  // Handle audio errors
  const handleAudioError = useCallback((error: Error) => {
    console.error('Audio error:', error);
  }, []);
  
  // Handle audio level changes
  const handleLevelChange = useCallback((level: number) => {
    setAudioLevel(level);
    setStoreAudioLevel(level);
  }, [setStoreAudioLevel]);
  
  // Set up audio capture
  const {
    devices,
    isSupported,
    error: audioError,
  } = useAudioCapture({
    onTranscript: handleTranscript,
    onInterim: handleInterim,
    onError: handleAudioError,
    onLevelChange: handleLevelChange,
  });
  
  // Set up keyboard shortcuts
  useKeyboardShortcuts({
    enabled: settings.keyboardShortcutsEnabled,
    onSearch: () => searchInputRef.current?.focus(),
  });
  
  // Don't render until mounted (prevents hydration mismatch)
  if (!mounted) {
    return (
      <div className="min-h-screen bg-verse-bg flex items-center justify-center">
        <div className="text-verse-muted">Loading VerseCue...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-verse-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-verse-border bg-verse-bg/80 backdrop-blur-xl">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 shadow-lg shadow-gold-500/20">
                <BookOpen className="w-5 h-5 text-verse-bg" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-gold-400">
                  VerseCue
                </h1>
                <p className="text-[10px] text-verse-muted uppercase tracking-wider">
                  Scripture Detection
                </p>
              </div>
            </div>
            
            {/* Status indicators */}
            <div className="flex items-center gap-4">
              {/* Listening indicator */}
              <div className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full',
                isListening && !isPaused
                  ? 'bg-red-500/10 text-red-500'
                  : isPaused
                    ? 'bg-yellow-500/10 text-yellow-500'
                    : 'bg-verse-border/50 text-verse-muted'
              )}>
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  isListening && !isPaused
                    ? 'bg-red-500 animate-pulse'
                    : isPaused
                      ? 'bg-yellow-500'
                      : 'bg-verse-muted'
                )} />
                <span className="text-sm font-medium">
                  {isListening && !isPaused
                    ? 'Listening'
                    : isPaused
                      ? 'Paused'
                      : 'Ready'}
                </span>
              </div>
              
              {/* Help button */}
              <button
                onClick={() => setShowHelp(!showHelp)}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  'text-verse-muted hover:text-verse-text hover:bg-verse-border/50',
                  showHelp && 'bg-verse-border text-verse-text'
                )}
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Help panel */}
      {showHelp && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b border-verse-border bg-verse-surface/50"
        >
          <div className="max-w-[1800px] mx-auto px-6 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Keyboard className="w-4 h-4 text-gold-400" />
              <h3 className="font-semibold text-sm text-verse-text">Keyboard Shortcuts</h3>
            </div>
            <div className="flex flex-wrap gap-4">
              {SHORTCUTS.map(({ key, action }) => (
                <div key={key} className="flex items-center gap-2">
                  <kbd className="px-2 py-1 rounded bg-verse-border text-verse-text font-mono text-xs">
                    {key}
                  </kbd>
                  <span className="text-sm text-verse-subtle">{action}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Main content */}
      <main className="max-w-[1800px] mx-auto px-6 py-6">
        {/* Audio controls */}
        <AudioControls
          devices={devices}
          isSupported={isSupported}
          error={audioError}
          audioLevel={audioLevel}
          className="mb-6"
        />
        
        {/* Main grid layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left column - Transcript */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <TranscriptPanel className="h-[400px]" />
            <ManualSearch inputRef={searchInputRef} />
          </div>
          
          {/* Center column - Detection queues */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <DetectionQueue className="min-h-[300px]" />
            <ApprovedQueue />
          </div>
          
          {/* Right column - Display & Stats */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <DisplayPreview />
            <SessionStats />
            <ExportPanel />
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-verse-border mt-12">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-xs text-verse-muted">
            <span>VerseCue v1.0.0</span>
            <span>The right verse, right on time.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
'''

def main():
    print("=" * 60)
    print("Fixing Hydration Error")
    print("=" * 60)
    
    write_file("src/app/page.tsx", MAIN_PAGE)
    
    print("\\n" + "=" * 60)
    print("Done! Refresh your browser (Cmd+Shift+R)")
    print("=" * 60)

if __name__ == "__main__":
    main()
