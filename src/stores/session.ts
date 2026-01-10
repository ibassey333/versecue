// ============================================
// Session State Store (Zustand)
// Manages all application state
// ============================================

import { create } from 'zustand';
import { DetectionResult, QueueItem, TranscriptSegment, AppSettings } from '@/types';

interface SessionState {
  // Session info
  sessionId: string;
  startedAt: Date | null;
  isListening: boolean;
  isPaused: boolean; // Preaching mode off
  
  // Transcript
  transcript: TranscriptSegment[];
  interimTranscript: string;
  
  // Detection queues
  pendingQueue: QueueItem[];
  approvedQueue: QueueItem[];
  
  // Currently displayed
  currentDisplay: QueueItem | null;
  displayHistory: QueueItem[];
  
  // Stats
  stats: {
    detected: number;
    approved: number;
    displayed: number;
    dismissed: number;
  };
  
  // Settings
  settings: AppSettings;
  
  // Audio
  selectedAudioDevice: string | null;
  audioLevel: number;
  
  // Actions
  startSession: () => void;
  endSession: () => void;
  toggleListening: () => void;
  togglePause: () => void;
  
  // Transcript actions
  addTranscriptSegment: (segment: TranscriptSegment) => void;
  setInterimTranscript: (text: string) => void;
  clearTranscript: () => void;
  
  // Detection actions
  addDetection: (detection: DetectionResult) => void;
  approveDetection: (id: string) => void;
  dismissDetection: (id: string) => void;
  
  // Display actions
  displayScripture: (id: string) => void;
  clearDisplay: () => void;
  
  // Audio actions
  setAudioDevice: (deviceId: string) => void;
  setAudioLevel: (level: number) => void;
  
  // Settings actions
  updateSettings: (settings: Partial<AppSettings>) => void;
  
  // Export
  getExportData: () => {
    sessionId: string;
    startedAt: Date | null;
    endedAt: Date;
    transcript: TranscriptSegment[];
    scriptures: QueueItem[];
    stats: SessionState['stats'];
  };
}

const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useSessionStore = create<SessionState>((set, get) => ({
  // Initial state
  sessionId: generateSessionId(),
  startedAt: null,
  isListening: false,
  isPaused: false,
  
  transcript: [],
  interimTranscript: '',
  
  pendingQueue: [],
  approvedQueue: [],
  
  currentDisplay: null,
  displayHistory: [],
  
  stats: {
    detected: 0,
    approved: 0,
    displayed: 0,
    dismissed: 0,
  },
  
  settings: {
    defaultTranslation: 'KJV',
    autoApproveHighConfidence: false,
    showTranscript: true,
    displayTheme: 'dark',
    keyboardShortcutsEnabled: true,
  },
  
  selectedAudioDevice: null,
  audioLevel: 0,
  
  // Session actions
  startSession: () => set({
    sessionId: generateSessionId(),
    startedAt: new Date(),
    isListening: true,
    isPaused: false,
    transcript: [],
    interimTranscript: '',
    pendingQueue: [],
    approvedQueue: [],
    currentDisplay: null,
    displayHistory: [],
    stats: { detected: 0, approved: 0, displayed: 0, dismissed: 0 },
  }),
  
  endSession: () => set({
    isListening: false,
    isPaused: false,
  }),
  
  toggleListening: () => set((state) => ({
    isListening: !state.isListening,
    startedAt: !state.isListening && !state.startedAt ? new Date() : state.startedAt,
  })),
  
  togglePause: () => set((state) => ({
    isPaused: !state.isPaused,
  })),
  
  // Transcript actions
  addTranscriptSegment: (segment) => set((state) => ({
    transcript: [...state.transcript, segment],
    interimTranscript: '',
  })),
  
  setInterimTranscript: (text) => set({ interimTranscript: text }),
  
  clearTranscript: () => set({ transcript: [], interimTranscript: '' }),
  
  // Detection actions
  addDetection: (detection) => set((state) => {
    // Check for duplicates
    const exists = state.pendingQueue.some(
      q => q.reference.reference === detection.reference.reference
    ) || state.approvedQueue.some(
      q => q.reference.reference === detection.reference.reference
    );
    
    if (exists) return state;
    
    const queueItem: QueueItem = {
      ...detection,
      status: 'pending',
    };
    
    // Auto-approve high confidence if enabled
    if (state.settings.autoApproveHighConfidence && detection.confidence === 'high') {
      return {
        approvedQueue: [...state.approvedQueue, { ...queueItem, status: 'approved', approvedAt: new Date() }],
        stats: {
          ...state.stats,
          detected: state.stats.detected + 1,
          approved: state.stats.approved + 1,
        },
      };
    }
    
    return {
      pendingQueue: [...state.pendingQueue, queueItem],
      stats: { ...state.stats, detected: state.stats.detected + 1 },
    };
  }),
  
  approveDetection: (id) => set((state) => {
    const item = state.pendingQueue.find(q => q.id === id);
    if (!item) return state;
    
    return {
      pendingQueue: state.pendingQueue.filter(q => q.id !== id),
      approvedQueue: [
        ...state.approvedQueue,
        { ...item, status: 'approved', approvedAt: new Date() },
      ],
      stats: { ...state.stats, approved: state.stats.approved + 1 },
    };
  }),
  
  dismissDetection: (id) => set((state) => ({
    pendingQueue: state.pendingQueue.filter(q => q.id !== id),
    stats: { ...state.stats, dismissed: state.stats.dismissed + 1 },
  })),
  
  // Display actions
  displayScripture: (id) => set((state) => {
    const item = state.approvedQueue.find(q => q.id === id);
    if (!item) return state;
    
    const displayedItem: QueueItem = {
      ...item,
      displayedAt: new Date(),
    };
    
    return {
      currentDisplay: displayedItem,
      displayHistory: [...state.displayHistory, displayedItem],
      approvedQueue: state.approvedQueue.filter(q => q.id !== id),
      stats: { ...state.stats, displayed: state.stats.displayed + 1 },
    };
  }),
  
  clearDisplay: () => set({ currentDisplay: null }),
  
  // Audio actions
  setAudioDevice: (deviceId) => set({ selectedAudioDevice: deviceId }),
  setAudioLevel: (level) => set({ audioLevel: level }),
  
  // Settings actions
  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings },
  })),
  
  // Export
  getExportData: () => {
    const state = get();
    return {
      sessionId: state.sessionId,
      startedAt: state.startedAt,
      endedAt: new Date(),
      transcript: state.transcript,
      scriptures: state.displayHistory,
      stats: state.stats,
    };
  },
}));

// Selector hooks for optimized re-renders
export const useIsListening = () => useSessionStore((state) => state.isListening);
export const useIsPaused = () => useSessionStore((state) => state.isPaused);
export const usePendingQueue = () => useSessionStore((state) => state.pendingQueue);
export const useApprovedQueue = () => useSessionStore((state) => state.approvedQueue);
export const useCurrentDisplay = () => useSessionStore((state) => state.currentDisplay);
export const useStats = () => useSessionStore((state) => state.stats);
export const useTranscript = () => useSessionStore((state) => state.transcript);
export const useInterimTranscript = () => useSessionStore((state) => state.interimTranscript);
