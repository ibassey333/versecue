// ============================================
// BroadcastChannel + localStorage for Display Sync
// ============================================

import { QueueItem } from '@/types';

const CHANNEL_NAME = 'versecue-display';
const STORAGE_KEY = 'versecue-current-display';

type DisplayMessage = 
  | { type: 'DISPLAY'; scripture: QueueItem }
  | { type: 'CLEAR' };

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
  return channel;
}

export function broadcastDisplay(scripture: QueueItem): void {
  try {
    // Save to localStorage for new windows
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scripture));
    // Broadcast to existing windows
    getChannel()?.postMessage({ type: 'DISPLAY', scripture } as DisplayMessage);
  } catch (e) {
    console.error('Broadcast failed:', e);
  }
}

export function broadcastClear(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    getChannel()?.postMessage({ type: 'CLEAR' } as DisplayMessage);
  } catch (e) {
    console.error('Broadcast failed:', e);
  }
}

export function getCurrentDisplay(): QueueItem | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function onDisplayMessage(callback: (msg: DisplayMessage) => void): () => void {
  const ch = getChannel();
  if (!ch) return () => {};
  
  const handler = (event: MessageEvent<DisplayMessage>) => {
    callback(event.data);
  };
  
  ch.addEventListener('message', handler);
  return () => ch.removeEventListener('message', handler);
}
