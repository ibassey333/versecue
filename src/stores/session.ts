// ============================================
// Session Store (v1.1)
// ============================================

import { create } from 'zustand';
import { DetectionResult, QueueItem, TranscriptSegment, SessionSettings } from '@/types';
import { broadcastDisplay, broadcastClear } from '@/lib/broadcast';

interface SessionState {
  sessionId: string | null;
  startedAt: Date | null;
  isListening: boolean;
  isPaused: boolean;
  selectedAudioDevice: string | null;
  audioLevel: number;
  transcript: TranscriptSegment[];
  interimTranscript: string;
  pendingQueue: QueueItem[];
  approvedQueue: QueueItem[];
  currentDisplay: QueueItem | null;
  detectionHistory: QueueItem[];
  displayHistory: QueueItem[];
  stats: { detected: number; approved: number; displayed: number; dismissed: number };
  settings: SessionSettings;
  
  startSession: () => void;
  endSession: () => void;
  toggleListening: () => void;
  togglePause: () => void;
  setAudioDevice: (deviceId: string) => void;
  setAudioLevel: (level: number) => void;
  addTranscriptSegment: (segment: TranscriptSegment) => void;
  setInterimTranscript: (text: string) => void;
  addDetection: (detection: DetectionResult) => void;
  approveDetection: (id: string) => void;
  dismissDetection: (id: string) => void;
  displayScripture: (id: string) => void;
  clearDisplay: () => void;
  updateSettings: (settings: Partial<SessionSettings>) => void;
  getExportData: () => unknown;
}

const AUTO_APPROVE_THRESHOLD = 0.85;

export const useSessionStore = create<SessionState>((set, get) => ({
  sessionId: null,
  startedAt: null,
  isListening: false,
  isPaused: false,
  selectedAudioDevice: null,
  audioLevel: 0,
  transcript: [],
  interimTranscript: '',
  pendingQueue: [],
  approvedQueue: [],
  currentDisplay: null,
  detectionHistory: [],
  displayHistory: [],
  stats: { detected: 0, approved: 0, displayed: 0, dismissed: 0 },
  settings: {
    translation: 'KJV',
    autoApproveHighConfidence: true,
    keyboardShortcutsEnabled: true,
    theme: 'dark',
  },
  
  startSession: () => set({
    sessionId: `session_${Date.now()}`,
    startedAt: new Date(),
    transcript: [],
    pendingQueue: [],
    approvedQueue: [],
    detectionHistory: [],
    displayHistory: [],
    currentDisplay: null,
    stats: { detected: 0, approved: 0, displayed: 0, dismissed: 0 },
  }),
  
  endSession: () => set({ isListening: false, isPaused: false }),
  
  toggleListening: () => {
    const { isListening } = get();
    if (!isListening) get().startSession();
    set({ isListening: !isListening });
  },
  
  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
  setAudioDevice: (deviceId) => set({ selectedAudioDevice: deviceId }),
  setAudioLevel: (level) => set({ audioLevel: level }),
  addTranscriptSegment: (segment) => set((state) => ({ transcript: [...state.transcript, segment], interimTranscript: '' })),
  setInterimTranscript: (text) => set({ interimTranscript: text }),
  
  addDetection: (detection) => {
    const { settings } = get();
    const item: QueueItem = {
      id: detection.id,
      reference: detection.reference,
      verseText: detection.verseText,
      translation: detection.translation,
      confidence: detection.confidence,
      confidenceScore: detection.confidenceScore,
      detectionType: detection.detectionType,
      detectedAt: detection.detectedAt,
    };
    
    const shouldAutoApprove = settings.autoApproveHighConfidence && detection.confidenceScore >= AUTO_APPROVE_THRESHOLD;
    
    set((state) => {
      if (shouldAutoApprove) {
        return {
          detectionHistory: [...state.detectionHistory, item],
          approvedQueue: [...state.approvedQueue, item],
          stats: { ...state.stats, detected: state.stats.detected + 1, approved: state.stats.approved + 1 },
        };
      } else {
        return {
          detectionHistory: [...state.detectionHistory, item],
          pendingQueue: [...state.pendingQueue, item],
          stats: { ...state.stats, detected: state.stats.detected + 1 },
        };
      }
    });
  },
  
  approveDetection: (id) => set((state) => {
    const item = state.pendingQueue.find((i) => i.id === id);
    if (!item) return state;
    return {
      pendingQueue: state.pendingQueue.filter((i) => i.id !== id),
      approvedQueue: [...state.approvedQueue, item],
      stats: { ...state.stats, approved: state.stats.approved + 1 },
    };
  }),
  
  dismissDetection: (id) => set((state) => ({
    pendingQueue: state.pendingQueue.filter((i) => i.id !== id),
    stats: { ...state.stats, dismissed: state.stats.dismissed + 1 },
  })),
  
  displayScripture: (id) => {
    const state = get();
    const item = state.approvedQueue.find((i) => i.id === id);
    if (!item) return;
    const displayItem = { ...item, displayedAt: new Date() };
    broadcastDisplay(displayItem);
    set((state) => ({
      approvedQueue: state.approvedQueue.filter((i) => i.id !== id),
      currentDisplay: displayItem,
      displayHistory: [...state.displayHistory, displayItem],
      stats: { ...state.stats, displayed: state.stats.displayed + 1 },
    }));
  },
  
  clearDisplay: () => { broadcastClear(); set({ currentDisplay: null }); },
  updateSettings: (newSettings) => set((state) => ({ settings: { ...state.settings, ...newSettings } })),
  getExportData: () => {
    const state = get();
    return { sessionId: state.sessionId, startedAt: state.startedAt, endedAt: new Date(), transcript: state.transcript, scriptures: state.displayHistory, stats: state.stats };
  },
}));
