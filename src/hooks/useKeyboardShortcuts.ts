// ============================================
// Keyboard Shortcuts Hook v2.0
// Added: Arrow keys for verse navigation
// ============================================

import { useEffect, useCallback } from 'react';
import { useSessionStore } from '@/stores/session';

interface ShortcutConfig {
  enabled: boolean;
  onApprove?: () => void;
  onDismiss?: () => void;
  onDisplay?: () => void;
  onClearDisplay?: () => void;
  onTogglePause?: () => void;
  onSearch?: () => void;
  onNextVerse?: () => void;
  onPrevVerse?: () => void;
}

export function useKeyboardShortcuts(config: ShortcutConfig) {
  const {
    pendingQueue,
    approvedQueue,
    currentDisplay,
    approveDetection,
    dismissDetection,
    displayScripture,
    clearDisplay,
    togglePause,
    goToNextVerse,
    goToPrevVerse,
  } = useSessionStore();
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!config.enabled) return;
    
    // Don't capture if user is typing in an input
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement
    ) {
      return;
    }
    
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        if (pendingQueue.length > 0) {
          approveDetection(pendingQueue[0].id);
          config.onApprove?.();
        } else if (approvedQueue.length > 0) {
          displayScripture(approvedQueue[0].id);
          config.onDisplay?.();
        }
        break;
        
      case 'Escape':
        event.preventDefault();
        if (currentDisplay) {
          clearDisplay();
          config.onClearDisplay?.();
        } else if (pendingQueue.length > 0) {
          dismissDetection(pendingQueue[0].id);
          config.onDismiss?.();
        }
        break;
        
      case ' ':
        event.preventDefault();
        togglePause();
        config.onTogglePause?.();
        break;
        
      case '/':
        event.preventDefault();
        config.onSearch?.();
        break;
        
      case 'ArrowRight':
        if (currentDisplay) {
          event.preventDefault();
          goToNextVerse();
          config.onNextVerse?.();
        }
        break;
        
      case 'ArrowLeft':
        if (currentDisplay) {
          event.preventDefault();
          goToPrevVerse();
          config.onPrevVerse?.();
        }
        break;
        
      default:
        break;
    }
  }, [
    config,
    pendingQueue,
    approvedQueue,
    currentDisplay,
    approveDetection,
    dismissDetection,
    displayScripture,
    clearDisplay,
    togglePause,
    goToNextVerse,
    goToPrevVerse,
  ]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export const SHORTCUTS = [
  { key: 'Enter', action: 'Approve pending / Display approved' },
  { key: 'Esc', action: 'Clear display / Dismiss pending' },
  { key: 'Space', action: 'Pause / Resume listening' },
  { key: '/', action: 'Focus search' },
  { key: '←', action: 'Previous verse' },
  { key: '→', action: 'Next verse' },
];
