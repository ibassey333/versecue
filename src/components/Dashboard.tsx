"use client";

import { useRef, useCallback, useState } from 'react';
import { BookOpen, Keyboard, HelpCircle, Mic, MicOff, Pause, Play, Settings, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/stores/session';
import { useKeyboardShortcuts, SHORTCUTS } from '@/hooks/useKeyboardShortcuts';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { detectScriptures } from '@/lib/detection';
import { TranscriptSegment, AudioDevice } from '@/types';

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
    <div className={cn('rounded-xl border border-verse-border bg-verse-surface p-5', className)}>
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={toggleListening}
          disabled={!isSupported}
          className={cn(
            'flex items-center gap-3 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300',
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
              'flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm border transition-all duration-200',
              isPaused
                ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500'
                : 'bg-verse-border/50 border-verse-border text-verse-text'
            )}
          >
            {isPaused ? <><Play className="w-4 h-4" /><span>Resume</span></> : <><Pause className="w-4 h-4" /><span>Pause</span></>}
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
                    i < activeBars ? (i < levelBars * 0.6 ? 'bg-green-500' : i < levelBars * 0.85 ? 'bg-yellow-500' : 'bg-red-500') : 'bg-verse-border'
                  )}
                  style={{ height: `${((i + 1) / levelBars) * 100}%` }}
                />
              ))}
            </div>
          </div>
        )}
        
        <button onClick={() => setShowSettings(!showSettings)} className={cn('p-3 rounded-xl transition-colors text-verse-muted hover:text-verse-text hover:bg-verse-border/50', showSettings && 'bg-verse-border text-verse-text')}>
          <Settings className="w-5 h-5" />
        </button>
      </div>
      
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      
      {showSettings && (
        <div className="mt-4 pt-4 border-t border-verse-border">
          <label className="block">
            <span className="text-xs font-medium text-verse-subtle uppercase tracking-wide">Audio Input Device</span>
            <select
              value={selectedAudioDevice || ''}
              onChange={(e) => setAudioDevice(e.target.value)}
              className="mt-2 w-full px-4 py-3 rounded-xl bg-verse-bg border border-verse-border text-verse-text text-sm"
            >
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}

function TranscriptPanel({ className }: { className?: string }) {
  const transcript = useSessionStore((s) => s.transcript);
  const interimTranscript = useSessionStore((s) => s.interimTranscript);
  const isListening = useSessionStore((s) => s.isListening);
  const isPaused = useSessionStore((s) => s.isPaused);
  
  return (
    <div className={cn('flex flex-col rounded-xl border border-verse-border bg-verse-surface', className)}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-verse-border">
        <div className="flex items-center gap-3">
          <div className={cn('w-2.5 h-2.5 rounded-full', isListening && !isPaused ? 'bg-red-500 animate-pulse' : 'bg-verse-muted')} />
          <h3 className="font-body text-sm font-semibold text-verse-text tracking-wide uppercase">Live Transcript</h3>
        </div>
        {isPaused && <span className="text-xs font-medium text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-full">Paused</span>}
      </div>
      
      <div className="flex-1 overflow-y-auto p-5 min-h-[200px] max-h-[400px]">
        {transcript.length === 0 && !interimTranscript ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="text-4xl mb-4 opacity-50">🎤</div>
            <p className="text-verse-subtle text-sm">{isListening ? 'Listening for speech...' : 'Click "Start Listening" to begin'}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {transcript.map((segment) => (
              <span key={segment.id} className="text-verse-text font-body text-[15px] leading-relaxed">{segment.text} </span>
            ))}
            {interimTranscript && <span className="text-verse-subtle font-body text-[15px] italic">{interimTranscript}</span>}
          </div>
        )}
      </div>
      
      <div className="px-5 py-3 border-t border-verse-border bg-verse-bg/50 rounded-b-xl">
        <div className="flex items-center justify-between text-xs text-verse-subtle">
          <span>{transcript.length} segments</span>
        </div>
      </div>
    </div>
  );
}

function DetectionQueue({ className }: { className?: string }) {
  const pendingQueue = useSessionStore((s) => s.pendingQueue);
  const approveDetection = useSessionStore((s) => s.approveDetection);
  const dismissDetection = useSessionStore((s) => s.dismissDetection);
  
  return (
    <div className={cn('flex flex-col rounded-xl border border-verse-border bg-verse-surface', className)}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-verse-border">
        <div className="flex items-center gap-3">
          <h3 className="font-body text-sm font-semibold text-verse-text tracking-wide uppercase">Detected</h3>
          {pendingQueue.length > 0 && (
            <span className="flex items-center justify-center min-w-[24px] h-6 px-2 text-xs font-bold text-verse-bg bg-gold-500 rounded-full">{pendingQueue.length}</span>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 min-h-[200px] max-h-[500px]">
        {pendingQueue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="text-4xl mb-4 opacity-50">👂</div>
            <p className="text-verse-subtle text-sm">Waiting for scripture references...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingQueue.map((item) => (
              <div key={item.id} className="rounded-xl border border-verse-border bg-verse-elevated p-4 border-l-4 border-l-green-500">
                <h4 className="font-display text-lg font-semibold text-gold-400 mb-2">{item.reference.reference}</h4>
                {item.verseText && <p className="text-sm text-verse-text/80 italic mb-3">"{item.verseText.substring(0, 100)}..."</p>}
                <div className="flex items-center gap-2">
                  <button onClick={() => approveDetection(item.id)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white font-medium text-sm hover:bg-green-600">
                    Approve <kbd className="text-[10px] opacity-60">↵</kbd>
                  </button>
                  <button onClick={() => dismissDetection(item.id)} className="px-4 py-2 rounded-lg bg-verse-border/50 text-verse-subtle font-medium text-sm hover:bg-verse-border">
                    Dismiss <kbd className="text-[10px] opacity-60">esc</kbd>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ApprovedQueue() {
  const approvedQueue = useSessionStore((s) => s.approvedQueue);
  const displayScripture = useSessionStore((s) => s.displayScripture);
  
  return (
    <div className="flex flex-col rounded-xl border border-verse-border bg-verse-surface">
      <div className="flex items-center justify-between px-5 py-4 border-b border-verse-border">
        <div className="flex items-center gap-3">
          <h3 className="font-body text-sm font-semibold text-verse-text tracking-wide uppercase">Ready to Display</h3>
          {approvedQueue.length > 0 && (
            <span className="flex items-center justify-center min-w-[24px] h-6 px-2 text-xs font-bold text-verse-bg bg-green-500 rounded-full">{approvedQueue.length}</span>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 min-h-[150px] max-h-[300px]">
        {approvedQueue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="text-3xl mb-3 opacity-50">📋</div>
            <p className="text-verse-subtle text-sm">Approved scriptures appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {approvedQueue.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl bg-verse-elevated border border-green-500/30">
                <div className="flex-1 min-w-0">
                  <h4 className="font-display text-lg font-semibold text-green-500">{item.reference.reference}</h4>
                </div>
                <button onClick={() => displayScripture(item.id)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold-500 text-verse-bg font-semibold text-sm hover:bg-gold-400">
                  Display <kbd className="text-[10px] opacity-60">↵</kbd>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DisplayPreview() {
  const currentDisplay = useSessionStore((s) => s.currentDisplay);
  const clearDisplay = useSessionStore((s) => s.clearDisplay);
  
  return (
    <div className="rounded-xl border border-verse-border bg-verse-surface overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-verse-border">
        <h3 className="font-body text-sm font-semibold text-verse-text tracking-wide uppercase">Display Preview</h3>
        <button onClick={() => window.open('/display', 'VerseCue Display', 'width=1920,height=1080')} className="text-xs text-verse-subtle hover:text-verse-text">
          Open Display ↗
        </button>
      </div>
      
      <div className="relative aspect-video bg-verse-bg">
        {currentDisplay ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <h2 className="font-display text-2xl font-bold text-gold-400 mb-4">{currentDisplay.reference.reference}</h2>
            {currentDisplay.verseText && <p className="font-scripture text-base text-verse-text leading-relaxed max-w-xl">"{currentDisplay.verseText}"</p>}
            <button onClick={clearDisplay} className="absolute top-4 right-4 p-2 rounded-lg bg-verse-surface/80 text-verse-muted hover:text-verse-text">✕</button>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="text-4xl mb-3 opacity-30">📺</div>
            <p className="text-verse-muted text-sm">No scripture displayed</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SessionStats() {
  const stats = useSessionStore((s) => s.stats);
  
  return (
    <div className="rounded-xl border border-verse-border bg-verse-surface p-4">
      <h3 className="font-body text-xs font-semibold text-verse-subtle tracking-wide uppercase mb-4">Session Stats</h3>
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Detected', value: stats.detected, color: 'text-gold-400' },
          { label: 'Approved', value: stats.approved, color: 'text-green-500' },
          { label: 'Displayed', value: stats.displayed, color: 'text-blue-400' },
          { label: 'Dismissed', value: stats.dismissed, color: 'text-verse-muted' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col items-center p-3 rounded-lg bg-verse-bg">
            <span className={cn('text-xl font-bold', color)}>{value}</span>
            <span className="text-[10px] text-verse-muted uppercase">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ManualSearch({ inputRef }: { inputRef: React.RefObject<HTMLInputElement> }) {
  const [query, setQuery] = useState('');
  
  return (
    <div className="rounded-xl border border-verse-border bg-verse-surface p-4">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search scripture... (e.g., John 3:16)"
        className="w-full px-4 py-3 rounded-xl bg-verse-bg border border-verse-border text-verse-text placeholder:text-verse-muted text-sm"
      />
      <p className="mt-2 text-[11px] text-verse-muted">
        Press <kbd className="px-1.5 py-0.5 rounded bg-verse-border font-mono text-[10px]">/</kbd> to focus
      </p>
    </div>
  );
}

export default function Dashboard() {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const isListening = useSessionStore((s) => s.isListening);
  const isPaused = useSessionStore((s) => s.isPaused);
  const settings = useSessionStore((s) => s.settings);
  const addDetection = useSessionStore((s) => s.addDetection);
  const addTranscriptSegment = useSessionStore((s) => s.addTranscriptSegment);
  const setInterimTranscript = useSessionStore((s) => s.setInterimTranscript);
  const setStoreAudioLevel = useSessionStore((s) => s.setAudioLevel);
  
  const handleTranscript = useCallback(async (segment: TranscriptSegment) => {
    addTranscriptSegment(segment);
    if (isPaused) return;
    const detections = await detectScriptures(segment.text, { fetchVerses: true });
    for (const detection of detections) {
      addDetection(detection);
    }
  }, [addDetection, addTranscriptSegment, isPaused]);
  
  const handleInterim = useCallback((text: string) => setInterimTranscript(text), [setInterimTranscript]);
  const handleAudioError = useCallback((error: Error) => console.error('Audio error:', error), []);
  const handleLevelChange = useCallback((level: number) => { setAudioLevel(level); setStoreAudioLevel(level); }, [setStoreAudioLevel]);
  
  const { devices, isSupported, error: audioError } = useAudioCapture({
    onTranscript: handleTranscript,
    onInterim: handleInterim,
    onError: handleAudioError,
    onLevelChange: handleLevelChange,
  });
  
  useKeyboardShortcuts({ enabled: settings.keyboardShortcutsEnabled, onSearch: () => searchInputRef.current?.focus() });
  
  return (
    <div className="min-h-screen bg-verse-bg">
      <header className="sticky top-0 z-50 border-b border-verse-border bg-verse-bg/80 backdrop-blur-xl">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600">
                <BookOpen className="w-5 h-5 text-verse-bg" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-gold-400">VerseCue</h1>
                <p className="text-[10px] text-verse-muted uppercase tracking-wider">Scripture Detection</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className={cn('flex items-center gap-2 px-4 py-2 rounded-full', isListening && !isPaused ? 'bg-red-500/10 text-red-500' : isPaused ? 'bg-yellow-500/10 text-yellow-500' : 'bg-verse-border/50 text-verse-muted')}>
                <div className={cn('w-2 h-2 rounded-full', isListening && !isPaused ? 'bg-red-500 animate-pulse' : isPaused ? 'bg-yellow-500' : 'bg-verse-muted')} />
                <span className="text-sm font-medium">{isListening && !isPaused ? 'Listening' : isPaused ? 'Paused' : 'Ready'}</span>
              </div>
              <button onClick={() => setShowHelp(!showHelp)} className={cn('p-2 rounded-lg text-verse-muted hover:text-verse-text', showHelp && 'bg-verse-border text-verse-text')}>
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>
      
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
                  <kbd className="px-2 py-1 rounded bg-verse-border text-verse-text font-mono text-xs">{key}</kbd>
                  <span className="text-sm text-verse-subtle">{action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <main className="max-w-[1800px] mx-auto px-6 py-6">
        <AudioControls devices={devices} isSupported={isSupported} error={audioError} audioLevel={audioLevel} className="mb-6" />
        
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
