// ============================================
// Keyboard Shortcuts Hook
// Handles all keyboard interactions
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
  } = useSessionStore();
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!config.enabled) return;
    
    // Don't capture if user is typing in an input
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return;
    }
    
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        // If there's something in pending, approve it
        if (pendingQueue.length > 0) {
          approveDetection(pendingQueue[0].id);
          config.onApprove?.();
        }
        // Else if there's something approved, display it
        else if (approvedQueue.length > 0) {
          displayScripture(approvedQueue[0].id);
          config.onDisplay?.();
        }
        break;
        
      case 'Escape':
        event.preventDefault();
        // If something is displayed, clear it
        if (currentDisplay) {
          clearDisplay();
          config.onClearDisplay?.();
        }
        // Else if there's something pending, dismiss it
        else if (pendingQueue.length > 0) {
          dismissDetection(pendingQueue[0].id);
          config.onDismiss?.();
        }
        break;
        
      case ' ':
        // Space to toggle pause (unless in input)
        event.preventDefault();
        togglePause();
        config.onTogglePause?.();
        break;
        
      case '/':
        // Forward slash to focus search
        event.preventDefault();
        config.onSearch?.();
        break;
        
      case 'ArrowUp':
        // Navigate up in queue (future enhancement)
        break;
        
      case 'ArrowDown':
        // Navigate down in queue (future enhancement)
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
  ]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Shortcut reference for help display
export const SHORTCUTS = [
  { key: 'Enter', action: 'Approve pending / Display approved' },
  { key: 'Esc', action: 'Clear display / Dismiss pending' },
  { key: 'Space', action: 'Toggle preaching mode' },
  { key: '/', action: 'Focus search' },
  { key: '↑↓', action: 'Navigate queue' },
];
