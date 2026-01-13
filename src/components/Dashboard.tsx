"use client";

import Link from 'next/link';

import { useRef, useCallback, useState, useEffect } from 'react';
import { 
  BookOpen, Keyboard, HelpCircle, Mic, MicOff, Pause, Play, 
  Settings, Volume2, History, ChevronLeft, ChevronRight, RefreshCw,
  X, Check, Search, AlertCircle, CheckCircle2, Zap, ChevronDown, ChevronUp, Brain
} from 'lucide-react';
import { cn, formatTime } from '@/lib/utils';
import { useSessionStore } from '@/stores/session';
import { useKeyboardShortcuts, SHORTCUTS } from '@/hooks/useKeyboardShortcuts';
import { useDisplaySync } from '@/hooks/useDisplaySync';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { detectScriptures } from '@/lib/detection';
import { fetchVerse } from '@/lib/bible';
import { TranscriptSegment, AudioDevice, QueueItem, ScriptureReference } from '@/types';
import { getEnabledTranslations } from '@/config/translations';
import { parseScriptures } from '@/lib/detection/parser';
import { EndSessionModal } from './EndSessionModal';

// ============================================
// API Status Component
// ============================================
function ApiStatus() {
  const hasApiBible = !!process.env.NEXT_PUBLIC_API_BIBLE_KEY;
  const hasDeepgram = !!process.env.NEXT_PUBLIC_DEEPGRAM_KEY;
  const hasGroq = !!process.env.NEXT_PUBLIC_GROQ_API_KEY;
  
  return (
    <div className="mt-4 pt-4 border-t border-verse-border">
      <h4 className="text-xs font-medium text-verse-subtle uppercase tracking-wide mb-3">API Status</h4>
      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-verse-bg">
          {hasApiBible ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-yellow-500" />}
          <div>
            <p className="text-xs font-medium text-verse-text">API.Bible</p>
            <p className="text-[10px] text-verse-muted">{hasApiBible ? 'Connected' : 'Not set'}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 p-2 rounded-lg bg-verse-bg">
          {hasDeepgram ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-verse-muted" />}
          <div>
            <p className="text-xs font-medium text-verse-text">Deepgram</p>
            <p className="text-[10px] text-verse-muted">{hasDeepgram ? 'Connected' : 'Optional'}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 p-2 rounded-lg bg-verse-bg">
          {hasGroq ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-verse-muted" />}
          <div>
            <p className="text-xs font-medium text-verse-text">Groq</p>
            <p className="text-[10px] text-verse-muted">{hasGroq ? 'Connected' : 'Optional'}</p>
          </div>
        </div>
      </div>
      <p className="mt-2 text-[10px] text-verse-muted">
        KJV works offline. WEB/ASV need API.Bible. Deepgram improves speech. Groq adds AI detection.
      </p>
    </div>
  );
}

// ============================================
// Audio Controls
// ============================================
function AudioControls({ devices, isSupported, error, audioLevel, speechProvider, className }: {
  devices: AudioDevice[];
  isSupported: boolean;
  error: string | null;
  audioLevel: number;
  speechProvider: 'browser' | 'deepgram';
  className?: string;
}) {
  const [showSettings, setShowSettings] = useState(false);
  const { 
    isListening, isPaused, selectedAudioDevice, settings,
    toggleListening, togglePause, setAudioDevice, newSession, updateSettings 
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
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600' 
              : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-400 hover:to-green-500 shadow-lg shadow-green-500/20',
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
          <>
            <button 
              onClick={togglePause} 
              className={cn(
                'flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm border transition-all',
                isPaused 
                  ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500' 
                  : 'bg-verse-border/50 border-verse-border text-verse-text hover:bg-verse-border'
              )}
            >
              {isPaused ? <><Play className="w-4 h-4" /><span>Resume</span></> : <><Pause className="w-4 h-4" /><span>Pause</span></>}
            </button>
            
            <div className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium',
              speechProvider === 'deepgram' 
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            )}>
              <Zap className="w-3 h-3" />
              <span>{speechProvider === 'deepgram' ? 'Deepgram' : 'Browser'}</span>
            </div>
            
            {settings.enableGroqDetection && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
                <Brain className="w-3 h-3" />
                <span>AI On</span>
              </div>
            )}
          </>
        )}
        
        <button
          onClick={newSession}
          className="flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm border border-verse-border text-verse-muted hover:text-verse-text hover:bg-verse-border/50 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          <span>New Session</span>
        </button>
        
        
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
                      ? (i < levelBars * 0.6 ? 'bg-green-500' : i < levelBars * 0.85 ? 'bg-yellow-500' : 'bg-red-500') 
                      : 'bg-verse-border'
                  )} 
                  style={{ height: `${((i + 1) / levelBars) * 100}%` }} 
                />
              ))}
            </div>
          </div>
        )}
        
        <button 
          onClick={() => setShowSettings(!showSettings)} 
          className={cn(
            'p-3 rounded-xl transition-colors text-verse-muted hover:text-verse-text',
            showSettings && 'bg-verse-border text-verse-text'
          )}
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
      
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      
      {showSettings && (
        <div className="mt-4 pt-4 border-t border-verse-border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <label className="block">
              <span className="text-xs font-medium text-verse-subtle uppercase tracking-wide">Audio Input</span>
              <select 
                value={selectedAudioDevice || ''} 
                onChange={(e) => setAudioDevice(e.target.value)} 
                className="mt-2 w-full px-4 py-3 rounded-xl bg-verse-bg border border-verse-border text-verse-text text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              >
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                ))}
              </select>
            </label>
            
            <label className="block">
              <span className="text-xs font-medium text-verse-subtle uppercase tracking-wide">Speech Recognition</span>
              <select 
                value={settings.speechProvider} 
                onChange={(e) => updateSettings({ speechProvider: e.target.value as 'browser' | 'deepgram' })} 
                className="mt-2 w-full px-4 py-3 rounded-xl bg-verse-bg border border-verse-border text-verse-text text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              >
                <option value="browser">Browser (Free)</option>
                <option value="deepgram">Deepgram (Best Accuracy)</option>
              </select>
            </label>
            
            <label className="block">
              <span className="text-xs font-medium text-verse-subtle uppercase tracking-wide">Default Translation</span>
              <select 
                value={settings.translation} 
                onChange={(e) => updateSettings({ translation: e.target.value })} 
                className="mt-2 w-full px-4 py-3 rounded-xl bg-verse-bg border border-verse-border text-verse-text text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              >
                {getEnabledTranslations().map((t) => (
                  <option key={t.id} value={t.id}>{t.name} {t.source === 'local' ? '(Offline)' : ''}</option>
                ))}
              </select>
            </label>
          </div>
          
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={settings.autoApproveHighConfidence}
                onChange={(e) => updateSettings({ autoApproveHighConfidence: e.target.checked })}
                className="w-4 h-4 rounded border-verse-border text-gold-500 focus:ring-gold-500"
              />
              <span className="text-sm text-verse-text">Auto-approve high confidence</span>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={settings.keyboardShortcutsEnabled}
                onChange={(e) => updateSettings({ keyboardShortcutsEnabled: e.target.checked })}
                className="w-4 h-4 rounded border-verse-border text-gold-500 focus:ring-gold-500"
              />
              <span className="text-sm text-verse-text">Keyboard shortcuts</span>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={settings.enableGroqDetection || false}
                onChange={(e) => updateSettings({ enableGroqDetection: e.target.checked })}
                className="w-4 h-4 rounded border-verse-border text-purple-500 focus:ring-purple-500"
              />
              <div className="flex items-center gap-2">
                <span className="text-sm text-verse-text">AI Detection (Groq)</span>
                {settings.enableGroqDetection && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">Uses credits</span>
                )}
              </div>
            </label>
          </div>
          
          <ApiStatus />
        </div>
      )}
    </div>
  );
}

// ============================================
// Transcript Panel
// ============================================
function TranscriptPanel({ speechProvider, className, orgSlug }: { speechProvider: 'browser' | 'deepgram'; className?: string; orgSlug?: string }) {
  const interimTranscript = useSessionStore((s) => s.interimTranscript);
  const { broadcastDisplay } = useDisplaySync(orgSlug);
  const transcript = useSessionStore((s) => s.transcript);
  const isListening = useSessionStore((s) => s.isListening);
  const isPaused = useSessionStore((s) => s.isPaused);
  
  return (
    <div className={cn('flex flex-col rounded-xl border border-verse-border bg-verse-surface', className)}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-verse-border">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-2.5 h-2.5 rounded-full',
            isListening && !isPaused ? 'bg-red-500 animate-pulse' : 'bg-verse-muted'
          )} />
          <h3 className="font-body text-sm font-semibold text-verse-text tracking-wide uppercase">
            Live Transcript
          </h3>
        </div>
        {isListening && (
          <span className={cn(
            'text-[10px] px-2 py-1 rounded-full font-medium',
            speechProvider === 'deepgram' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
          )}>
            {speechProvider === 'deepgram' ? '🎯 Deepgram' : '🌐 Browser'}
          </span>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-5 min-h-[200px] max-h-[350px]">
        {transcript.length === 0 && !interimTranscript ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="text-4xl mb-4 opacity-50">🎤</div>
            <p className="text-verse-subtle text-sm">
              {isListening ? 'Listening for speech...' : 'Click "Start Listening" to begin'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {transcript.map((seg) => (
              <span key={seg.id} className="text-verse-text font-body text-[15px] leading-relaxed">{seg.text} </span>
            ))}
            {interimTranscript && (
              <span className="text-verse-subtle font-body text-[15px] italic">{interimTranscript}</span>
            )}
          </div>
        )}
      </div>
      
      <div className="px-5 py-3 border-t border-verse-border bg-verse-bg/50 rounded-b-xl">
        <span className="text-xs text-verse-subtle">{transcript.length} segments</span>
      </div>
    </div>
  );
}

// ============================================
// Needs Review - Collapsible
// ============================================
function NeedsReview({ className }: { className?: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const pendingQueue = useSessionStore((s) => s.pendingQueue);
  const approveDetection = useSessionStore((s) => s.approveDetection);
  const dismissDetection = useSessionStore((s) => s.dismissDetection);
  
  const count = pendingQueue.length;
  
  return (
    <div className={cn('rounded-xl border border-verse-border bg-verse-surface overflow-hidden', className)}>
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-verse-bg/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? <ChevronUp className="w-4 h-4 text-verse-muted" /> : <ChevronDown className="w-4 h-4 text-verse-muted" />}
          <span className="font-body text-sm font-medium text-verse-text">Needs Review</span>
          {count > 0 && (
            <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold text-verse-bg bg-yellow-500 rounded-full">
              {count}
            </span>
          )}
        </div>
        {count === 0 && <span className="text-xs text-verse-muted">All clear</span>}
      </button>
      
      {isExpanded && count > 0 && (
        <div className="px-4 pb-4 space-y-3 max-h-[200px] overflow-y-auto">
          {pendingQueue.map((item) => (
            <div key={item.id} className="rounded-lg border border-yellow-500/30 bg-verse-elevated p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-display text-base font-semibold text-yellow-500">{item.reference.reference}</h4>
                <span className="text-[10px] text-verse-muted">{item.detectionType}</span>
              </div>
              {item.verseText && <p className="text-xs text-verse-muted mb-2 line-clamp-2">{item.verseText}</p>}
              <div className="flex items-center gap-2">
                <button onClick={() => approveDetection(item.id)} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-green-500 text-white text-xs font-medium hover:bg-green-600">
                  <Check className="w-3 h-3" /> Approve
                </button>
                <button onClick={() => dismissDetection(item.id)} className="px-2 py-1.5 rounded bg-verse-border text-verse-subtle text-xs hover:bg-verse-elevated">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {isExpanded && count === 0 && (
        <div className="px-4 pb-4 text-center">
          <p className="text-xs text-verse-muted">Low-confidence detections appear here</p>
        </div>
      )}
    </div>
  );
}

// ============================================
// Ready to Display - Full Column, Newest First
// ============================================
function ReadyToDisplay({ className }: { className?: string }) {
  const approvedQueue = useSessionStore((s) => s.approvedQueue);
  const displayScripture = useSessionStore((s) => s.displayScripture);
  const redisplayScripture = useSessionStore((s) => s.redisplayScripture);
  const removeFromApproved = useSessionStore((s) => s.removeFromApproved);
  
  // Reverse to show newest first
  const sortedQueue = [...approvedQueue].reverse();
  
  return (
    <div className={cn('flex flex-col rounded-xl border border-verse-border bg-verse-surface', className)}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-verse-border">
        <div className="flex items-center gap-3">
          <h3 className="font-body text-sm font-semibold text-verse-text tracking-wide uppercase">Ready to Display</h3>
          {approvedQueue.length > 0 && (
            <span className="flex items-center justify-center min-w-[24px] h-6 px-2 text-xs font-bold text-verse-bg bg-green-500 rounded-full">{approvedQueue.length}</span>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 min-h-[300px]">
        {approvedQueue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="text-4xl mb-3 opacity-30">📋</div>
            <p className="text-verse-muted text-sm">Detected scriptures appear here</p>
            <p className="text-verse-subtle text-xs mt-1">Say a scripture reference to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedQueue.map((item, index) => (
              <div 
                key={item.id} 
                className={cn(
                  'rounded-xl border p-4 transition-all',
                  item.displayedAt 
                    ? 'border-verse-border/50 bg-verse-bg/50' 
                    : index === 0 
                      ? 'border-green-500 bg-green-500/5 ring-1 ring-green-500/20' 
                      : 'border-green-500/30 bg-verse-elevated'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className={cn(
                      'font-display text-lg font-semibold',
                      item.displayedAt ? 'text-verse-muted' : 'text-green-500'
                    )}>
                      {item.reference.reference}
                    </h4>
                    {index === 0 && !item.displayedAt && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 uppercase">Latest</span>
                    )}
                    {item.detectionType === 'llm' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">AI</span>
                    )}
                  </div>
                  <button onClick={() => removeFromApproved(item.id)} className="p-1 text-verse-muted hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {item.verseText && (
                  <p className="text-sm text-verse-muted mb-3 line-clamp-2">"{item.verseText}"</p>
                )}
                
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => item.displayedAt ? redisplayScripture(item.id) : displayScripture(item.id)} 
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all',
                      item.displayedAt 
                        ? 'bg-verse-border text-verse-text hover:bg-verse-elevated' 
                        : 'bg-gold-500 text-verse-bg hover:bg-gold-400'
                    )}
                  >
                    {item.displayedAt ? 'Re-display' : 'Display'} <kbd className="text-[10px] opacity-60">↵</kbd>
                  </button>
                  {item.displayedAt && (
                    <span className="text-[10px] text-green-500">✓ Shown {formatTime(item.displayedAt)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Display Preview
// ============================================
function DisplayPreview({ orgSlug }: { orgSlug?: string }) {
  const currentDisplay = useSessionStore((s) => s.currentDisplay);
  const clearDisplay = useSessionStore((s) => s.clearDisplay);
  const goToNextVerse = useSessionStore((s) => s.goToNextVerse);
  const goToPrevVerse = useSessionStore((s) => s.goToPrevVerse);
  
  return (
    <div className="rounded-xl border border-verse-border bg-verse-surface overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-verse-border">
        <h3 className="font-body text-sm font-semibold text-verse-text tracking-wide uppercase">Display Preview</h3>
        <a href={orgSlug ? `/display/${orgSlug}` : "/display"} target="_blank" className="text-xs text-verse-subtle hover:text-verse-text transition-colors">Open Display ↗</a>
      </div>
      
      <div className="relative aspect-video bg-verse-bg">
        {currentDisplay ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <h2 className="font-display text-xl font-bold text-gold-400 mb-3">{currentDisplay.reference.reference}</h2>
            {currentDisplay.verseText && <p className="font-scripture text-sm text-verse-text leading-relaxed max-w-md line-clamp-3">"{currentDisplay.verseText}"</p>}
            {currentDisplay.translation && <span className="mt-2 text-[10px] text-verse-muted uppercase">— {currentDisplay.translation} —</span>}
            
            <div className="flex items-center gap-2 mt-3">
              <button onClick={goToPrevVerse} className="p-1.5 rounded-lg bg-verse-surface text-verse-muted hover:text-verse-text transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={goToNextVerse} className="p-1.5 rounded-lg bg-verse-surface text-verse-muted hover:text-verse-text transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            <button onClick={clearDisplay} className="absolute top-2 right-2 p-1.5 rounded-lg bg-verse-surface/80 text-verse-muted hover:text-verse-text text-sm transition-colors">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="text-3xl mb-2 opacity-30">📺</div>
            <p className="text-verse-muted text-xs">No scripture displayed</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Translation Selector
// ============================================
function TranslationSelector({ className }: { className?: string }) {
  const settings = useSessionStore((s) => s.settings);
  const setTranslation = useSessionStore((s) => s.setTranslation);
  const changeDisplayTranslation = useSessionStore((s) => s.changeDisplayTranslation);
  const currentDisplay = useSessionStore((s) => s.currentDisplay);
  const [loading, setLoading] = useState<string | null>(null);
  
  const translations = getEnabledTranslations();
  const quickTranslations = translations.slice(0, 3);
  
  const handleChange = async (newTranslation: string) => {
    setTranslation(newTranslation);
    if (currentDisplay) {
      setLoading(newTranslation);
      await changeDisplayTranslation(newTranslation);
      setLoading(null);
    }
  };
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-xs text-verse-subtle">Translation:</span>
      {quickTranslations.map((t) => (
        <button
          key={t.id}
          onClick={() => handleChange(t.id)}
          disabled={loading === t.id}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
            settings.translation === t.id
              ? 'bg-gold-500 text-verse-bg'
              : 'bg-verse-border text-verse-muted hover:text-verse-text hover:bg-verse-elevated',
            loading === t.id && 'opacity-50'
          )}
        >
          {loading === t.id ? '...' : t.abbreviation}
        </button>
      ))}
    </div>
  );
}

// ============================================
// Session Stats (Compact)
// ============================================
function SessionStats() {
  const stats = useSessionStore((s) => s.stats);
  
  return (
    <div className="rounded-xl border border-verse-border bg-verse-surface p-4">
      <h3 className="font-body text-xs font-semibold text-verse-subtle tracking-wide uppercase mb-3">Session Stats</h3>
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Detected', value: stats.detected, color: 'text-gold-400' },
          { label: 'Approved', value: stats.approved, color: 'text-green-500' },
          { label: 'Displayed', value: stats.displayed, color: 'text-blue-400' },
          { label: 'Dismissed', value: stats.dismissed, color: 'text-verse-muted' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col items-center p-2 rounded-lg bg-verse-bg">
            <span className={cn('text-lg font-bold', color)}>{value}</span>
            <span className="text-[9px] text-verse-muted uppercase">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Session Log (Compact)
// ============================================
function SessionLog() {
  const detectionHistory = useSessionStore((s) => s.detectionHistory);
  
  return (
    <div className="rounded-xl border border-verse-border bg-verse-surface">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-verse-border">
        <History className="w-3 h-3 text-verse-muted" />
        <h3 className="font-body text-xs font-semibold text-verse-text tracking-wide uppercase">Session Log</h3>
        <span className="text-[10px] text-verse-muted">({detectionHistory.length})</span>
      </div>
      
      <div className="max-h-[150px] overflow-y-auto p-2">
        {detectionHistory.length === 0 ? (
          <p className="text-verse-subtle text-xs text-center py-3">No detections yet</p>
        ) : (
          <div className="space-y-1">
            {detectionHistory.slice().reverse().slice(0, 10).map((item) => (
              <div key={item.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-verse-bg/50 text-xs">
                <div className="flex items-center gap-2">
                  <span className={cn('w-1.5 h-1.5 rounded-full', item.confidence === 'high' ? 'bg-green-500' : item.confidence === 'medium' ? 'bg-yellow-500' : 'bg-gray-500')} />
                  <span className="font-medium text-verse-text">{item.reference.reference}</span>
                  <span className="text-[9px] text-verse-muted px-1 py-0.5 rounded bg-verse-border">{item.detectionType}</span>
                </div>
                <span className="text-[9px] text-verse-muted">{formatTime(item.detectedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Manual Search
// ============================================
function ManualSearch({ onSearch }: { onSearch: (ref: ScriptureReference, text: string) => Promise<void> }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setError(null);
    setLoading(true);
    
    try {
      const parsed = parseScriptures(query);
      if (parsed.length === 0) {
        setError('Try "John 3:16" or "Psalm 23:1"');
        setLoading(false);
        return;
      }
      
      await onSearch(parsed[0].reference, query);
      setQuery('');
    } catch (err) {
      setError('Failed to fetch verse');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="rounded-xl border border-verse-border bg-verse-surface p-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input 
          ref={inputRef}
          type="text" 
          value={query} 
          onChange={(e) => setQuery(e.target.value)} 
          placeholder="Search scripture... (e.g., John 3:16)" 
          className="flex-1 px-4 py-2.5 rounded-xl bg-verse-bg border border-verse-border text-verse-text placeholder:text-verse-muted text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50" 
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className={cn(
            'px-4 py-2.5 rounded-xl bg-gold-500 text-verse-bg font-medium text-sm transition-all hover:bg-gold-400',
            (loading || !query.trim()) && 'opacity-50 cursor-not-allowed'
          )}
        >
          {loading ? '...' : <Search className="w-4 h-4" />}
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <p className="mt-2 text-[10px] text-verse-muted">
        Press <kbd className="px-1 py-0.5 rounded bg-verse-border font-mono text-[9px]">/</kbd> to focus
      </p>
    </div>
  );
}

// ============================================
// Main Dashboard
// ============================================
export default function Dashboard({ orgSlug }: { orgSlug?: string }) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [showEndSession, setShowEndSession] = useState(false);
  const [sessionStartTime] = useState(new Date());
  const [activeSpeechProvider, setActiveSpeechProvider] = useState<'browser' | 'deepgram'>('browser');
  
  const { broadcastDisplay } = useDisplaySync(orgSlug);
  const transcript = useSessionStore((s) => s.transcript);
  const isListening = useSessionStore((s) => s.isListening);
  const isPaused = useSessionStore((s) => s.isPaused);
  const settings = useSessionStore((s) => s.settings);
  const addDetection = useSessionStore((s) => s.addDetection);
  const addTranscriptSegment = useSessionStore((s) => s.addTranscriptSegment);
  const setInterimTranscript = useSessionStore((s) => s.setInterimTranscript);
  const setStoreAudioLevel = useSessionStore((s) => s.setAudioLevel);
  
  useEffect(() => {
    if (isListening) {
      setActiveSpeechProvider(settings.speechProvider);
    }
  }, [isListening, settings.speechProvider]);

  // Broadcast display changes to Supabase for remote display
  const currentDisplay = useSessionStore((s) => s.currentDisplay);
  useEffect(() => {
    broadcastDisplay(currentDisplay);
  }, [currentDisplay, broadcastDisplay]);
  
  const handleTranscript = useCallback(async (segment: TranscriptSegment) => {
    addTranscriptSegment(segment);
    if (isPaused) return;
    const detections = await detectScriptures(segment.text, settings.enableGroqDetection || false);
    for (const detection of detections) addDetection(detection);
  }, [addDetection, addTranscriptSegment, isPaused, settings.enableGroqDetection]);
  
  const handleInterim = useCallback((text: string) => setInterimTranscript(text), [setInterimTranscript]);
  const handleAudioError = useCallback((error: Error) => console.error('Audio error:', error), []);
  const handleLevelChange = useCallback((level: number) => { setAudioLevel(level); setStoreAudioLevel(level); }, [setStoreAudioLevel]);
  
  const handleManualSearch = useCallback(async (ref: ScriptureReference, matchedText: string) => {
    const verse = await fetchVerse(ref, settings.translation);
    
    const detection = {
      id: `manual_${Date.now()}`,
      reference: ref,
      matchedText,
      confidence: 'high' as const,
      confidenceScore: 1,
      detectionType: 'deterministic' as const,
      detectedAt: new Date(),
      verseText: verse?.text || '',
      translation: settings.translation,
    };
    
    addDetection(detection);
  }, [addDetection, settings.translation]);
  
  const { devices, isSupported, error: audioError } = useAudioCapture({ 
    onTranscript: handleTranscript, 
    onInterim: handleInterim, 
    onError: handleAudioError, 
    onLevelChange: handleLevelChange 
  });
  
  useKeyboardShortcuts({ 
    enabled: settings.keyboardShortcutsEnabled, 
    onSearch: () => searchInputRef.current?.focus() 
  });
  
  return (
    <div className="min-h-screen bg-verse-bg">
      {/* Header */}
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
              <div className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full',
                isListening && !isPaused ? 'bg-red-500/10 text-red-500' : isPaused ? 'bg-yellow-500/10 text-yellow-500' : 'bg-verse-border/50 text-verse-muted'
              )}>
                <div className={cn('w-2 h-2 rounded-full', isListening && !isPaused ? 'bg-red-500 animate-pulse' : isPaused ? 'bg-yellow-500' : 'bg-verse-muted')} />
                <span className="text-sm font-medium">{isListening && !isPaused ? 'Listening' : isPaused ? 'Paused' : 'Ready'}</span>
              </div>
              
              <Link href="/sessions" className="p-2 rounded-lg text-verse-muted hover:text-verse-text transition-colors" title="Past Sessions">
                <History className="w-5 h-5" />
              </Link>
              
              <button onClick={() => setShowHelp(!showHelp)} className={cn('p-2 rounded-lg text-verse-muted hover:text-verse-text transition-colors', showHelp && 'bg-verse-border text-verse-text')}>
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Help Bar */}
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
      
      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-6 py-6">
        <div className="flex items-center gap-4 mb-6">
          <AudioControls 
            devices={devices} 
            isSupported={isSupported} 
            error={audioError} 
            audioLevel={audioLevel} 
            speechProvider={activeSpeechProvider}
            className="flex-1" 
          />
          
          {transcript.length > 0 && (
            <button
              onClick={() => setShowEndSession(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm bg-green-600 text-white hover:bg-green-500 transition-all shadow-lg"
            >
              <span>💾</span>
              <span>Save Notes</span>
            </button>
          )}
        </div>
        
        {/* New Layout: 3 columns */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column: Transcript + Search + Needs Review */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            <TranscriptPanel speechProvider={activeSpeechProvider} className="h-[400px]" />
            <ManualSearch onSearch={handleManualSearch} />
            <NeedsReview />
          </div>
          
          {/* Middle Column: Ready to Display (full height) */}
          <div className="col-span-12 lg:col-span-4">
            <ReadyToDisplay className="h-full max-h-[calc(100vh-250px)] overflow-y-auto" />
          </div>
          
          {/* Right Column: Display + Translation + Stats + Log */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            <DisplayPreview orgSlug={orgSlug} />
            <TranslationSelector />
            <SessionStats />
            <SessionLog />
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <EndSessionModal 
        isOpen={showEndSession} 
        onClose={() => setShowEndSession(false)} 
        startTime={sessionStartTime}
      />
      
      <footer className="border-t border-verse-border mt-8">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-xs text-verse-muted">
            <span>VerseCue v2.0.0</span>
            <span>The right verse, right on time.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
