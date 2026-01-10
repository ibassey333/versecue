// ============================================
// Session Store v1.3.1
// ============================================

import { create } from 'zustand';
import { DetectionResult, QueueItem, TranscriptSegment } from '@/types';
import { broadcastDisplay, broadcastClear } from '@/lib/broadcast';
import { fetchVerse } from '@/lib/bible';

interface SessionState {
  sessionId: string | null;
  startedAt: Date | null;
  isListening: boolean;
  isPaused: boolean;
  selectedAudioDevice: string | null;
  audioLevel: number;
  transcript: TranscriptSegment[];
  interimTranscript: string;
  detectionQueue: QueueItem[];
  approvedQueue: QueueItem[];
  currentDisplay: QueueItem | null;
  stats: { detected: number; approved: number; displayed: number; dismissed: number };
  settings: {
    autoApprove: boolean;
    translation: string;
  };
  
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
  goToNextVerse: () => Promise<void>;
  goToPrevVerse: () => Promise<void>;
  removeFromApproved: (id: string) => void;
  updateSettings: (settings: Partial<SessionState['settings']>) => void;
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
  detectionQueue: [],
  approvedQueue: [],
  currentDisplay: null,
  stats: { detected: 0, approved: 0, displayed: 0, dismissed: 0 },
  settings: {
    autoApprove: true,
    translation: 'KJV',
  },
  
  startSession: () => set({
    sessionId: `session_${Date.now()}`,
    startedAt: new Date(),
    transcript: [],
    detectionQueue: [],
    approvedQueue: [],
    currentDisplay: null,
    stats: { detected: 0, approved: 0, displayed: 0, dismissed: 0 },
  }),
  
  endSession: () => set({ isListening: false, isPaused: false }),
  
  toggleListening: () => {
    const { isListening } = get();
    if (!isListening) get().startSession();
    set({ isListening: !isListening });
  },
  
  togglePause: () => set((s) => ({ isPaused: !s.isPaused })),
  setAudioDevice: (deviceId) => set({ selectedAudioDevice: deviceId }),
  setAudioLevel: (level) => set({ audioLevel: level }),
  addTranscriptSegment: (segment) => set((s) => ({ 
    transcript: [...s.transcript, segment], 
    interimTranscript: '' 
  })),
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
    
    const shouldAutoApprove = settings.autoApprove && detection.confidenceScore >= AUTO_APPROVE_THRESHOLD;
    
    set((state) => {
      // Check duplicates
      const exists = [...state.approvedQueue, ...state.detectionQueue]
        .some(q => q.reference.reference === item.reference.reference);
      if (exists) return state;
      
      if (shouldAutoApprove) {
        return {
          approvedQueue: [item, ...state.approvedQueue],
          stats: { ...state.stats, detected: state.stats.detected + 1, approved: state.stats.approved + 1 },
        };
      } else {
        return {
          detectionQueue: [item, ...state.detectionQueue],
          stats: { ...state.stats, detected: state.stats.detected + 1 },
        };
      }
    });
  },
  
  approveDetection: (id) => set((state) => {
    const item = state.detectionQueue.find((i) => i.id === id);
    if (!item) return state;
    return {
      detectionQueue: state.detectionQueue.filter((i) => i.id !== id),
      approvedQueue: [item, ...state.approvedQueue],
      stats: { ...state.stats, approved: state.stats.approved + 1 },
    };
  }),
  
  dismissDetection: (id) => set((state) => ({
    detectionQueue: state.detectionQueue.filter((i) => i.id !== id),
    stats: { ...state.stats, dismissed: state.stats.dismissed + 1 },
  })),
  
  // Display and KEEP in approved queue (mark as shown)
  displayScripture: (id) => {
    const state = get();
    const item = state.approvedQueue.find((i) => i.id === id);
    if (!item) return;
    
    const displayItem = { ...item, displayedAt: new Date() };
    broadcastDisplay(displayItem);
    
    set((s) => ({
      currentDisplay: displayItem,
      approvedQueue: s.approvedQueue.map(q => 
        q.id === id ? { ...q, displayedAt: new Date() } : q
      ),
      stats: { ...s.stats, displayed: s.stats.displayed + 1 },
    }));
  },
  
  clearDisplay: () => { 
    broadcastClear(); 
    set({ currentDisplay: null }); 
  },
  
  // Go to NEXT verse (single verse, not cumulative)
  goToNextVerse: async () => {
    const { currentDisplay, settings } = get();
    if (!currentDisplay) return;
    
    const ref = currentDisplay.reference;
    const nextVerseNum = (ref.verseEnd || ref.verseStart || 1) + 1;
    
    const nextRef = {
      book: ref.book,
      chapter: ref.chapter,
      verseStart: nextVerseNum,
      verseEnd: null,
      reference: `${ref.book} ${ref.chapter}:${nextVerseNum}`,
    };
    
    const verse = await fetchVerse(nextRef, settings.translation);
    if (!verse || !verse.text) return;
    
    const newItem: QueueItem = {
      id: `nav_${Date.now()}`,
      reference: nextRef,
      verseText: verse.text,
      translation: settings.translation,
      confidence: 'high',
      confidenceScore: 1,
      detectionType: 'deterministic',
      detectedAt: new Date(),
      displayedAt: new Date(),
    };
    
    broadcastDisplay(newItem);
    set({ currentDisplay: newItem });
  },
  
  // Go to PREVIOUS verse
  goToPrevVerse: async () => {
    const { currentDisplay, settings } = get();
    if (!currentDisplay) return;
    
    const ref = currentDisplay.reference;
    const prevVerseNum = (ref.verseStart || 1) - 1;
    if (prevVerseNum < 1) return;
    
    const prevRef = {
      book: ref.book,
      chapter: ref.chapter,
      verseStart: prevVerseNum,
      verseEnd: null,
      reference: `${ref.book} ${ref.chapter}:${prevVerseNum}`,
    };
    
    const verse = await fetchVerse(prevRef, settings.translation);
    if (!verse || !verse.text) return;
    
    const newItem: QueueItem = {
      id: `nav_${Date.now()}`,
      reference: prevRef,
      verseText: verse.text,
      translation: settings.translation,
      confidence: 'high',
      confidenceScore: 1,
      detectionType: 'deterministic',
      detectedAt: new Date(),
      displayedAt: new Date(),
    };
    
    broadcastDisplay(newItem);
    set({ currentDisplay: newItem });
  },
  
  removeFromApproved: (id) => set((s) => ({
    approvedQueue: s.approvedQueue.filter((i) => i.id !== id),
  })),
  
  updateSettings: (newSettings) => set((s) => ({ 
    settings: { ...s.settings, ...newSettings } 
  })),
}));
