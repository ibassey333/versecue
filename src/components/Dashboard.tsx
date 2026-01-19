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
import { EditableSessionModal } from './EditableSessionModal';
import { useKeyboardShortcuts, SHORTCUTS } from '@/hooks/useKeyboardShortcuts';
import { useDisplaySync } from '@/hooks/useDisplaySync';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { detectScriptures } from '@/lib/detection';
import { fetchVerse } from '@/lib/bible';
import { TranscriptSegment, AudioDevice, QueueItem, ScriptureReference } from '@/types';
import { getEnabledTranslations } from '@/config/translations';
import { ControlsBar, SettingsDrawer } from '@/components/dashboard-ui';
import { parseScriptures } from '@/lib/detection/parser';
import { SmartScriptureSearch } from '@/components/SmartScriptureSearch';

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
            <p className="text-xs font-medium text-verse-text">Speech Engine</p>
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
        KJV works offline. Other translations require internet.
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
  const transcriptEndRef = useRef<HTMLDivElement>(null);
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
              <span>{speechProvider === 'deepgram' ? 'Enhanced' : 'Standard'}</span>
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
                <option value="deepgram">Enhanced (Best Accuracy)</option>
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
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to latest text
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [transcript, interimTranscript]);
  
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
            {speechProvider === 'deepgram' ? '🎯 Enhanced' : '🌐 Standard'}
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
            <div ref={scrollRef} />
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
function ReadyToDisplay({ className, splitThreshold = 70 }: { className?: string; splitThreshold?: number }) {
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
                    onClick={() => item.displayedAt ? redisplayScripture(item.id, splitThreshold) : displayScripture(item.id, splitThreshold)} 
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
// WYSIWYG Preview - Shows exact display styling
// ============================================
interface DisplaySettingsPreview {
  verse_font_size: number;
  verse_font_family: string;
  verse_color: string;
  verse_bold: boolean;
  verse_italic: boolean;
  text_outline: boolean;
  text_outline_color: string;
  text_outline_width: number;
  text_shadow: boolean;
  reference_font_size: number;
  reference_color: string;
  reference_position: string;
  show_translation: boolean;
  translation_color: string;
  background_color: string;
  background_image_url: string | null;
  text_align: string;
  vertical_align: string;
  padding: number;
}

const DEFAULT_DISPLAY_SETTINGS: DisplaySettingsPreview = {
  verse_font_size: 42,
  verse_font_family: 'serif',
  verse_color: '#ffffff',
  verse_bold: false,
  verse_italic: false,
  text_outline: false,
  text_outline_color: '#000000',
  text_outline_width: 1,
  text_shadow: true,
  reference_font_size: 56,
  reference_color: '#fbbf24',
  reference_position: 'top',
  show_translation: true,
  translation_color: '#9ca3af',
  background_color: '#000000',
  background_image_url: null,
  text_align: 'center',
  vertical_align: 'center',
  padding: 48,
};

function DisplayPreview({ orgSlug, splitThreshold = 70, displaySettings }: { 
  orgSlug?: string; 
  splitThreshold?: number;
  displaySettings?: DisplaySettingsPreview | null;
}) {
  const currentDisplay = useSessionStore((s) => s.currentDisplay);
  const clearDisplay = useSessionStore((s) => s.clearDisplay);
  const goToNextVerse = useSessionStore((s) => s.goToNextVerse);
  const goToPrevVerse = useSessionStore((s) => s.goToPrevVerse);
  const goToNextPart = useSessionStore((s) => s.goToNextPart);
  const goToPrevPart = useSessionStore((s) => s.goToPrevPart);
  const currentPart = useSessionStore((s) => s.currentPart);
  const totalParts = useSessionStore((s) => s.totalParts);
  const verseParts = useSessionStore((s) => s.verseParts);
  
  const settings = displaySettings || DEFAULT_DISPLAY_SETTINGS;
  
  // Get text for current part
  const displayText = verseParts.length > 0 
    ? verseParts[currentPart - 1] 
    : currentDisplay?.verseText;
  
  // Scale factor for preview (display is ~1920px, preview is ~400px)
  const scale = 0.25;
  
  // Font family mapping
  const fontFamily = {
    serif: 'Georgia, serif',
    sans: 'system-ui, sans-serif',
    mono: 'monospace',
  }[settings.verse_font_family] || 'Georgia, serif';
  
  // Vertical alignment
  const verticalAlign = {
    top: 'justify-start pt-4',
    center: 'justify-center',
    bottom: 'justify-end pb-4',
  }[settings.vertical_align] || 'justify-center';
  
  // Build verse text styles
  const verseStyles: React.CSSProperties = {
    fontFamily,
    fontSize: settings.verse_font_size * scale,
    color: settings.verse_color,
    fontWeight: settings.verse_bold ? 'bold' : 'normal',
    fontStyle: settings.verse_italic ? 'italic' : 'normal',
    textAlign: settings.text_align as any,
    textShadow: settings.text_shadow ? '1px 1px 2px rgba(0,0,0,0.5)' : 'none',
  };
  
  if (settings.text_outline) {
    verseStyles.WebkitTextStroke = `${settings.text_outline_width * scale}px ${settings.text_outline_color}`;
  }
  
  return (
    <div className="rounded-xl border border-verse-border bg-verse-surface overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-verse-border">
        <h3 className="font-body text-sm font-semibold text-verse-text tracking-wide uppercase">Live Preview</h3>
        <a href={orgSlug ? `/display/${orgSlug}` : "/display"} target="_blank" className="text-xs text-verse-subtle hover:text-verse-text transition-colors">Open Display ↗</a>
      </div>
      
      {/* WYSIWYG Preview Container */}
      <div 
        className="relative aspect-video overflow-hidden"
        style={{
          backgroundColor: settings.background_color,
          backgroundImage: settings.background_image_url ? `url(${settings.background_image_url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {currentDisplay ? (
          <div 
            className={cn("absolute inset-0 flex flex-col items-center text-center", verticalAlign)}
            style={{ padding: settings.padding * scale }}
          >
            {/* Reference - Top */}
            {settings.reference_position === 'top' && (
              <h2 
                className="font-bold mb-1"
                style={{ 
                  fontSize: settings.reference_font_size * scale,
                  color: settings.reference_color,
                  textAlign: settings.text_align as any,
                }}
              >
                {currentDisplay.reference.reference}
              </h2>
            )}
            
            {/* Part indicator for operator */}
            {totalParts > 1 && (
              <div className="flex items-center gap-1 mb-1 bg-black/50 rounded-lg px-2 py-1">
                <button 
                  onClick={goToPrevPart} 
                  disabled={currentPart <= 1}
                  className={cn(
                    "p-0.5 rounded transition-colors",
                    currentPart <= 1 
                      ? "text-white/20 cursor-not-allowed" 
                      : "text-gold-400 hover:text-gold-300"
                  )}
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span 
                  className="text-[8px] font-medium px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24' }}
                >
                  Part {currentPart}/{totalParts}
                </span>
                <button 
                  onClick={goToNextPart} 
                  disabled={currentPart >= totalParts}
                  className={cn(
                    "p-0.5 rounded transition-colors",
                    currentPart >= totalParts 
                      ? "text-white/20 cursor-not-allowed" 
                      : "text-gold-400 hover:text-gold-300"
                  )}
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}
            
            {/* Verse Text */}
            {displayText && (
              <p className="leading-relaxed" style={verseStyles}>
                "{displayText}"
              </p>
            )}
            
            {/* Reference - Bottom */}
            {settings.reference_position === 'bottom' && (
              <h2 
                className="font-bold mt-1"
                style={{ 
                  fontSize: settings.reference_font_size * scale,
                  color: settings.reference_color,
                  textAlign: settings.text_align as any,
                }}
              >
                {currentDisplay.reference.reference}
              </h2>
            )}
            
            {/* Translation */}
            {settings.show_translation && currentDisplay.translation && (
              <span 
                className="mt-1 uppercase tracking-wider"
                style={{ 
                  fontSize: 8,
                  color: settings.translation_color,
                }}
              >
                — {currentDisplay.translation} —
              </span>
            )}
            
            {/* Verse Navigation */}
            <div className="flex items-center gap-2 mt-2 bg-black/50 rounded-lg px-2 py-1">
              <button 
                onClick={() => goToPrevVerse(splitThreshold)} 
                className="p-1 rounded text-white/70 hover:text-white transition-colors" 
                title="Previous verse"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <span className="text-[8px] text-white/50">Verse</span>
              <button 
                onClick={() => goToNextVerse(splitThreshold)} 
                className="p-1 rounded text-white/70 hover:text-white transition-colors" 
                title="Next verse"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            
            {/* Clear button */}
            <button 
              onClick={clearDisplay} 
              className="absolute top-1 right-1 p-1 rounded bg-black/50 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="text-2xl mb-1 opacity-30">📺</div>
            <p className="text-white/50 text-[10px]">No scripture displayed</p>
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
  const toggleListening = useSessionStore((s) => s.toggleListening);
  const togglePause = useSessionStore((s) => s.togglePause);
  const newSession = useSessionStore((s) => s.newSession);
  const updateSettings = useSessionStore((s) => s.updateSettings);
  const setAudioDevice = useSessionStore((s) => s.setAudioDevice);
  const selectedAudioDevice = useSessionStore((s) => s.selectedAudioDevice);
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
  const [showSettings, setShowSettings] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [showEndSession, setShowEndSession] = useState(false);
  const [sessionStartTime] = useState(new Date());
  const [activeSpeechProvider, setActiveSpeechProvider] = useState<'browser' | 'deepgram'>('browser');
  
  const { broadcastDisplay } = useDisplaySync(orgSlug);
  const transcript = useSessionStore((s) => s.transcript);
  const isListening = useSessionStore((s) => s.isListening);
  const isPaused = useSessionStore((s) => s.isPaused);
  const settings = useSessionStore((s) => s.settings);
  const toggleListening = useSessionStore((s) => s.toggleListening);
  const togglePause = useSessionStore((s) => s.togglePause);
  const newSession = useSessionStore((s) => s.newSession);
  const updateSettings = useSessionStore((s) => s.updateSettings);
  const setAudioDevice = useSessionStore((s) => s.setAudioDevice);
  const selectedAudioDevice = useSessionStore((s) => s.selectedAudioDevice);
  const addDetection = useSessionStore((s) => s.addDetection);
  const addTranscriptSegment = useSessionStore((s) => s.addTranscriptSegment);
  const setInterimTranscript = useSessionStore((s) => s.setInterimTranscript);
  const setStoreAudioLevel = useSessionStore((s) => s.setAudioLevel);
  
  useEffect(() => {
    if (isListening) {
      setActiveSpeechProvider(settings.speechProvider);
    }
  }, [isListening, settings.speechProvider]);

  // Fetch split threshold from display settings
  const [splitThreshold, setSplitThreshold] = useState(70);
  const [displaySettings, setDisplaySettings] = useState<DisplaySettingsPreview | null>(null);
  
  useEffect(() => {
    const fetchDisplaySettings = async () => {
      if (!orgSlug) return;
      const supabase = (await import('@/lib/supabase/client')).createClient();
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', orgSlug)
        .single();
      
      if (org) {
        const { data: settings } = await supabase
          .from('display_settings')
          .select('*')
          .eq('organization_id', org.id)
          .single();
        
        if (settings) {
          setSplitThreshold(settings.split_word_threshold || 70);
          setDisplaySettings({
            verse_font_size: settings.verse_font_size ?? 42,
            verse_font_family: settings.verse_font_family ?? 'serif',
            verse_color: settings.verse_color ?? '#ffffff',
            verse_bold: settings.verse_bold ?? false,
            verse_italic: settings.verse_italic ?? false,
            text_outline: settings.text_outline ?? false,
            text_outline_color: settings.text_outline_color ?? '#000000',
            text_outline_width: settings.text_outline_width ?? 1,
            text_shadow: settings.text_shadow ?? true,
            reference_font_size: settings.reference_font_size ?? 56,
            reference_color: settings.reference_color ?? '#fbbf24',
            reference_position: settings.reference_position ?? 'top',
            show_translation: settings.show_translation ?? true,
            translation_color: settings.translation_color ?? '#9ca3af',
            background_color: settings.background_color ?? '#000000',
            background_image_url: settings.background_image_url,
            text_align: settings.text_align ?? 'center',
            vertical_align: settings.vertical_align ?? 'center',
            padding: settings.padding ?? 48,
          });
        }
      }
    };
    fetchDisplaySettings();
  }, [orgSlug]);
  
  // Broadcast display changes to Supabase for remote display
  const currentDisplay = useSessionStore((s) => s.currentDisplay);
  const currentPart = useSessionStore((s) => s.currentPart);
  const totalParts = useSessionStore((s) => s.totalParts);
  const verseParts = useSessionStore((s) => s.verseParts);
  
  useEffect(() => {
    broadcastDisplay(currentDisplay, { currentPart, totalParts, verseParts });
  }, [currentDisplay, currentPart, totalParts, verseParts, broadcastDisplay]);
  
  const handleTranscript = useCallback(async (segment: TranscriptSegment) => {
    addTranscriptSegment(segment);
    if (isPaused) return;
    const detections = await detectScriptures(segment.text, settings.enableGroqDetection || false);
    for (const detection of detections) {
      // Check if already in pending or approved queue
      const state = useSessionStore.getState();
      const inPending = state.pendingQueue.find(
        (item: any) => item.reference.reference === detection.reference.reference
      );
      const inApproved = state.approvedQueue.find(
        (item: any) => item.reference.reference === detection.reference.reference
      );
      
      if (inPending || inApproved) {
        // Already in queue - move to top
        const queueType = inPending ? 'pendingQueue' : 'approvedQueue';
        const queue = inPending ? [...state.pendingQueue] : [...state.approvedQueue];
        const itemIndex = queue.findIndex(
          (item: any) => item.reference.reference === detection.reference.reference
        );
        
        if (itemIndex >= 0 && itemIndex < queue.length - 1) {
          // Move to END of array (displays at TOP because queue is reversed)
          const item = queue[itemIndex];
          const newQueue = [...queue.slice(0, itemIndex), ...queue.slice(itemIndex + 1), item];
          useSessionStore.setState({ [queueType]: newQueue } as any);
          console.log('[VerseCue] Moved to top (display):', detection.reference.reference);
        } else {
          console.log('[VerseCue] Already at top:', detection.reference.reference);
        }
      } else {
        addDetection(detection);
      }
    }
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
    
    // Check if already in queue (same logic as voice detection)
    const state = useSessionStore.getState();
    const inPending = state.pendingQueue.find(
      (item: any) => item.reference.reference === detection.reference.reference
    );
    const inApproved = state.approvedQueue.find(
      (item: any) => item.reference.reference === detection.reference.reference
    );
    
    if (inPending || inApproved) {
      // Move to top instead of duplicating
      const queueType = inPending ? 'pendingQueue' : 'approvedQueue';
      const queue = inPending ? [...state.pendingQueue] : [...state.approvedQueue];
      const itemIndex = queue.findIndex(
        (item: any) => item.reference.reference === detection.reference.reference
      );
      
      if (itemIndex >= 0 && itemIndex < queue.length - 1) {
        const item = queue[itemIndex];
        const newQueue = [...queue.slice(0, itemIndex), ...queue.slice(itemIndex + 1), item];
        useSessionStore.setState({ [queueType]: newQueue } as any);
        console.log('[VerseCue] Search: Moved to top:', detection.reference.reference);
      }
    } else {
      addDetection(detection);
    }
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
      {/* Controls Bar */}
      <ControlsBar
        isListening={isListening}
        isPaused={isPaused}
        onStartListening={toggleListening}
        onStopListening={toggleListening}
        onTogglePause={togglePause}
        onNewSession={newSession}
        translation={settings.translation}
        onTranslationChange={(t: string) => updateSettings({ translation: t })}
        availableTranslations={getEnabledTranslations().map(t => t.id)}
        onOpenSettings={() => setShowSettings(true)}
        showSaveNotes={transcript.length > 0}
        onSaveNotes={() => setShowEndSession(true)}
      />
      

      
      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-6 py-6">
        
        {/* New Layout: 3 columns */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column: Transcript + Search + Needs Review */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            <TranscriptPanel speechProvider={activeSpeechProvider} className="h-[400px]" />
            <SmartScriptureSearch 
              onSelect={handleManualSearch}
              aiEnabled={settings.enableGroqDetection}
              placeholder="Type book, reference, or verse text..."
            />
            <NeedsReview />
          </div>
          
          {/* Middle Column: Ready to Display (full height) */}
          <div className="col-span-12 lg:col-span-4">
            <ReadyToDisplay className="h-full max-h-[calc(100vh-250px)] overflow-y-auto" splitThreshold={splitThreshold} />
          </div>
          
          {/* Right Column: Display + Translation + Stats + Log */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            <DisplayPreview orgSlug={orgSlug} splitThreshold={splitThreshold} displaySettings={displaySettings} />
            <TranslationSelector />
            <SessionStats />
            <SessionLog />
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <EditableSessionModal 
        isOpen={showEndSession} 
        onClose={() => setShowEndSession(false)} 
        
      />
      
      {/* Settings Drawer */}
      <SettingsDrawer
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        audioDevices={devices}
        selectedDevice={selectedAudioDevice || ''}
        onDeviceChange={setAudioDevice}
        speechProvider={settings.speechProvider}
        onSpeechProviderChange={(p: 'browser' | 'deepgram') => updateSettings({ speechProvider: p })}
        deepgramAvailable={true}
        aiDetectionEnabled={settings.enableGroqDetection || false}
        onAiDetectionChange={(e: boolean) => updateSettings({ enableGroqDetection: e })}
        groqAvailable={true}
        autoApprove={settings.autoApproveHighConfidence}
        onAutoApproveChange={(e: boolean) => updateSettings({ autoApproveHighConfidence: e })}
        apiStatus={{
          bible: 'connected',
          deepgram: 'connected',
          groq: 'connected',
        }}
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
