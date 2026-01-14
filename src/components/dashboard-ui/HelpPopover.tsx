"use client";

import { useEffect, useRef } from 'react';
import { Keyboard, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const SHORTCUTS = [
  { keys: ['Enter'], action: 'Approve / Display' },
  { keys: ['Esc'], action: 'Clear / Dismiss' },
  { keys: ['Space'], action: 'Pause / Resume' },
  { keys: ['/'], action: 'Focus search' },
  { keys: ['←'], action: 'Previous verse' },
  { keys: ['→'], action: 'Next verse' },
];

interface HelpPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement>;
}

export function HelpPopover({ isOpen, onClose, anchorRef }: HelpPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute top-full right-0 mt-2 w-72 bg-verse-surface border border-verse-border rounded-xl shadow-xl z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-verse-border bg-verse-elevated">
        <div className="flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-gold-500" />
          <h3 className="text-sm font-semibold text-verse-text">Keyboard Shortcuts</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-verse-muted hover:text-verse-text transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-3 space-y-1">
        {SHORTCUTS.map(({ keys, action }) => (
          <div key={action} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-verse-border/50">
            <span className="text-sm text-verse-muted">{action}</span>
            <div className="flex items-center gap-1">
              {keys.map((key) => (
                <kbd key={key} className="px-2 py-0.5 bg-verse-bg border border-verse-border rounded text-xs font-mono text-verse-text">
                  {key}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
