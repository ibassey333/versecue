#!/usr/bin/env python3
"""
Add full VerseCue dashboard with hydration fixes
"""
import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path) if os.path.dirname(path) else '.', exist_ok=True)
    with open(path, 'w') as f:
        f.write(content)
    print(f"✅ Created: {path}")

MAIN_PAGE = '''"use client";

import { useRef, useCallback, useState, useEffect } from 'react';
import { BookOpen, Keyboard, HelpCircle, Mic, MicOff, Pause, Play, Settings, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/stores/session';
import { useKeyboardShortcuts, SHORTCUTS } from '@/hooks/useKeyboardShortcuts';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { detectScriptures } from '@/lib/detection';
import { TranscriptSegment, AudioDevice } from '@/types';

// Import components
import { TranscriptPanel } from '@/components/operator/TranscriptPanel';
import { DetectionQueue } from '@/components/operator/DetectionQueue';
import { ApprovedQueue } from '@/components/operator/ApprovedQueue';
import { DisplayPreview } from '@/components/operator/DisplayPreview';
import { ManualSearch } from '@/components/operator/ManualSearch';
import { SessionStats } from '@/components/operator/SessionStats';
import { ExportPanel } from '@/components/operator/ExportPanel';

// Inline AudioControls to avoid import issues
function AudioControls({
  devices,
  isSupported,
  error,
  audioLevel,
  className,
}: {
  devices: AudioDevice[];
  isSupported: boolean;
  error: string | null;
  audioLevel: number;
  className?: string;
}) {
  const [showSettings, setShowSettings] = useState(false);
  
  const {
    isListening,
    isPaused,
    selectedAudioDevice,
    toggleListening,
    togglePause,
    setAudioDevice,
  } = useSessionStore();
  
  const levelBars = 20;
  const activeBars = Math.floor(audioLevel * levelBars);
  
  return (
    <div className={cn(
      'rounded-xl border border-verse-border bg-verse-surface p-5',
      className
    )}>
      <div className="flex items-center gap-4">
        <button
          onClick={toggleListening}
          disabled={!isSupported}
          className={cn(
            'flex items-center gap-3 px-6 py-3 rounded-xl font-semibold text-sm',
            'transition-all duration-300',
            isListening
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
              : 'bg-green-500 text-white hover:bg-green-600',
            !isSupported && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isListening ? (
            <>
              <MicOff className="w-5 h-5" />
              <span>Stop Listening</span>
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              <span>Start Listening</span>
            </>
          )}
        </button>
        
        {isListening && (
          <button
            onClick={togglePause}
            className={cn(
              'flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm',
              'border transition-all duration-200',
              isPaused
                ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500'
                : 'bg-verse-border/50 border-verse-border text-verse-text'
            )}
          >
            {isPaused ? (
              <>
                <Play className="w-4 h-4" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </>
            )}
          </button>
        )}
        
        {isListening && (
          <div className="flex items-center gap-3 px-4">
            <Volume2 className="w-4 h-4 text-verse-muted" />
            <div className="flex items-end gap-0.5 h-6">
              {Array.from({ length: levelBars }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-1 rounded-full transition-all duration-75',
                    i < activeBars
                      ? i < levelBars * 0.6
                        ? 'bg-green-500'
                        : i < levelBars * 0.85
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      : 'bg-verse-border'
                  )}
                  style={{
                    height: `${((i + 1) / levelBars) * 100}%`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
        
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={cn(
            'p-3 rounded-xl transition-colors',
            'text-verse-muted hover:text-verse-text hover:bg-verse-border/50',
            showSettings && 'bg-verse-border text-verse-text'
          )}
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
      
      {error && (
        <p className="mt-3 text-sm text-red-500">{error}</p>
      )}
      
      {showSettings && (
        <div className="mt-4 pt-4 border-t border-verse-border">
          <label className="block">
            <span className="text-xs font-medium text-verse-subtle uppercase tracking-wide">
              Audio Input Device
            </span>
            <select
              value={selectedAudioDevice || ''}
              onChange={(e) => setAudioDevice(e.target.value)}
              className={cn(
                'mt-2 w-full px-4 py-3 rounded-xl',
                'bg-verse-bg border border-verse-border',
                'text-verse-text text-sm'
              )}
            >
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          </label>
          
          <p className="mt-3 text-xs text-verse-muted">
            <strong>Pro tip:</strong> For best results, connect your mixer output to a USB audio interface.
          </p>
        </div>
      )}
    </div>
  );
}

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
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const handleTranscript = useCallback(async (segment: TranscriptSegment) => {
    addTranscriptSegment(segment);
    
    if (isPaused) return;
    
    const detections = await detectScriptures(segment.text, {
      fetchVerses: true,
    });
    
    for (const detection of detections) {
      addDetection(detection);
    }
  }, [addDetection, addTranscriptSegment, isPaused]);
  
  const handleInterim = useCallback((text: string) => {
    setInterimTranscript(text);
  }, [setInterimTranscript]);
  
  const handleAudioError = useCallback((error: Error) => {
    console.error('Audio error:', error);
  }, []);
  
  const handleLevelChange = useCallback((level: number) => {
    setAudioLevel(level);
    setStoreAudioLevel(level);
  }, [setStoreAudioLevel]);
  
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
  
  useKeyboardShortcuts({
    enabled: settings.keyboardShortcutsEnabled,
    onSearch: () => searchInputRef.current?.focus(),
  });
  
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
            
            <div className="flex items-center gap-4">
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
                  {isListening && !isPaused ? 'Listening' : isPaused ? 'Paused' : 'Ready'}
                </span>
              </div>
              
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
        <div className="border-b border-verse-border bg-verse-surface/50">
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
        </div>
      )}
      
      {/* Main content */}
      <main className="max-w-[1800px] mx-auto px-6 py-6">
        <AudioControls
          devices={devices}
          isSupported={isSupported}
          error={audioError}
          audioLevel={audioLevel}
          className="mb-6"
        />
        
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <TranscriptPanel className="h-[400px]" />
            <ManualSearch inputRef={searchInputRef} />
          </div>
          
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <DetectionQueue className="min-h-[300px]" />
            <ApprovedQueue />
          </div>
          
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <DisplayPreview />
            <SessionStats />
            <ExportPanel />
          </div>
        </div>
      </main>
      
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
    print("Adding Full Dashboard")
    print("=" * 60)
    
    write_file("src/app/page.tsx", MAIN_PAGE)
    
    print("\n" + "=" * 60)
    print("Done! Hard refresh browser: Cmd+Shift+R")
    print("=" * 60)

if __name__ == "__main__":
    main()
