"use client";

import { useRef, useState } from 'react';
import { Mic, MicOff, RotateCcw, Settings, HelpCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HelpPopover } from './HelpPopover';

interface ControlsBarProps {
  isListening: boolean;
  isPaused: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  onTogglePause: () => void;
  onNewSession: () => void;
  translation: string;
  onTranslationChange: (translation: string) => void;
  availableTranslations: string[];
  onOpenSettings: () => void;
  showSaveNotes?: boolean;
  onSaveNotes?: () => void;
}

export function ControlsBar({
  isListening,
  isPaused,
  onStartListening,
  onStopListening,
  onTogglePause,
  onNewSession,
  translation,
  onTranslationChange,
  availableTranslations,
  onOpenSettings,
  showSaveNotes,
  onSaveNotes,
}: ControlsBarProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [showTranslations, setShowTranslations] = useState(false);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const translationRef = useRef<HTMLDivElement>(null);

  const handleTranslationBlur = () => {
    setTimeout(() => setShowTranslations(false), 150);
  };

  return (
    <div className="sticky top-16 z-40 border-b border-verse-border bg-verse-bg">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            {!isListening ? (
              <button
                onClick={onStartListening}
                className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-gold-500 text-verse-bg font-semibold rounded-xl hover:bg-gold-400 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-gold-500/20"
              >
                <Mic className="w-4 h-4" />
                <span className="hidden sm:inline">Start Listening</span>
                <span className="sm:hidden">Start</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={onTogglePause}
                  className={cn(
                    'flex items-center gap-2 px-4 sm:px-5 py-2.5 font-semibold rounded-xl transition-all',
                    isPaused
                      ? 'bg-gold-500 text-verse-bg hover:bg-gold-400'
                      : 'bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20'
                  )}
                >
                  {isPaused ? (
                    <>
                      <Mic className="w-4 h-4" />
                      <span className="hidden sm:inline">Resume</span>
                    </>
                  ) : (
                    <>
                      <div className="w-4 h-4 flex items-center justify-center">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      </div>
                      <span className="hidden sm:inline">Listening</span>
                    </>
                  )}
                </button>
                <button
                  onClick={onStopListening}
                  className="p-2.5 text-verse-muted hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                  title="Stop"
                >
                  <MicOff className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={onNewSession}
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 text-verse-muted hover:text-verse-text border border-verse-border rounded-xl hover:bg-verse-surface transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">New Session</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Save Notes */}
            {showSaveNotes && onSaveNotes && (
              <button
                onClick={onSaveNotes}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium text-sm rounded-xl hover:bg-green-500 transition-colors"
              >
                <span>💾</span>
                <span className="hidden sm:inline">Save Notes</span>
              </button>
            )}
            
            <div className="relative" ref={translationRef}>
              <button
                onClick={() => setShowTranslations(!showTranslations)}
                onBlur={handleTranslationBlur}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-verse-text bg-verse-surface border border-verse-border rounded-lg hover:border-verse-muted transition-colors"
              >
                <span>{translation}</span>
                <ChevronDown className={cn('w-3.5 h-3.5 text-verse-muted transition-transform', showTranslations && 'rotate-180')} />
              </button>
              
              {showTranslations && (
                <div className="absolute top-full right-0 mt-1 w-40 bg-verse-surface border border-verse-border rounded-xl shadow-xl overflow-hidden z-50">
                  {availableTranslations.map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        onTranslationChange(t);
                        setShowTranslations(false);
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors',
                        translation === t
                          ? 'bg-gold-500/10 text-gold-400'
                          : 'text-verse-text hover:bg-verse-border'
                      )}
                    >
                      {t}
                      {translation === t && <span className="text-gold-500">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="w-px h-6 bg-verse-border hidden sm:block" />

            <button
              onClick={onOpenSettings}
              className="p-2.5 text-verse-muted hover:text-verse-text rounded-lg hover:bg-verse-surface transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>

            <div className="relative">
              <button
                ref={helpButtonRef}
                onClick={() => setShowHelp(!showHelp)}
                className={cn(
                  'p-2.5 rounded-lg transition-colors',
                  showHelp
                    ? 'text-gold-400 bg-gold-500/10'
                    : 'text-verse-muted hover:text-verse-text hover:bg-verse-surface'
                )}
                title="Keyboard Shortcuts"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
              <HelpPopover
                isOpen={showHelp}
                onClose={() => setShowHelp(false)}
                anchorRef={helpButtonRef}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
