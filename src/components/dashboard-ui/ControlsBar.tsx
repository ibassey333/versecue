"use client";

import { useRef, useState } from 'react';
import { Settings, HelpCircle, BookOpen, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HelpPopover } from './HelpPopover';

interface ControlsBarProps {
  onOpenSettings: () => void;
  showSaveNotes?: boolean;
  onSaveNotes?: () => void;
  // Worship mode
  mode?: 'sermon' | 'worship';
  onModeChange?: (mode: 'sermon' | 'worship') => void;
}

export function ControlsBar({
  onOpenSettings,
  showSaveNotes,
  onSaveNotes,
  mode,
  onModeChange,
}: ControlsBarProps) {
  const [showHelp, setShowHelp] = useState(false);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  
  // Default to sermon mode if not provided
  const currentMode = mode || 'sermon';

  return (
    <div className="sticky top-16 z-40 border-b border-verse-border bg-verse-bg">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left side - Mode Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            {onModeChange && (
              <div className="flex items-center bg-verse-surface border border-verse-border rounded-xl p-1">
                <button
                  onClick={() => onModeChange('sermon')}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    currentMode === 'sermon'
                      ? 'bg-gold-500 text-verse-bg shadow-sm'
                      : 'text-verse-muted hover:text-verse-text'
                  )}
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Sermon</span>
                </button>
                <button
                  onClick={() => onModeChange('worship')}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    currentMode === 'worship'
                      ? 'bg-green-500 text-white shadow-sm'
                      : 'text-verse-muted hover:text-verse-text'
                  )}
                >
                  <Music className="w-4 h-4" />
                  <span className="hidden sm:inline">Worship</span>
                </button>
              </div>
            )}
          </div>

          {/* Right side - Save Notes, Settings, Help */}
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
