// ============================================
// Session Store v2.0
// Merged v1.1 premium + v1.3 features
// ============================================

import { create } from 'zustand';
import { DetectionResult, QueueItem, TranscriptSegment, SessionSettings } from '@/types';
import { broadcastDisplay, broadcastClear } from '@/lib/broadcast';
import { fetchVerse } from '@/lib/bible';

interface SessionState {
  // Session
  sessionId: string | null;
  startedAt: Date | null;
  
  // Audio
  isListening: boolean;
  isPaused: boolean;
  selectedAudioDevice: string | null;
  audioLevel: number;
  
  // Transcript
  transcript: TranscriptSegment[];
  interimTranscript: string;
  
  // Queues (using v1.1 naming: pendingQueue)
  pendingQueue: QueueItem[];
  approvedQueue: QueueItem[];
  currentDisplay: QueueItem | null;
  
  // History
  detectionHistory: QueueItem[];
  displayHistory: QueueItem[];
  
  // Stats
  stats: { detected: number; approved: number; displayed: number; dismissed: number };
  
  // Settings
  settings: SessionSettings;
  
  // Actions - Session
  startSession: () => void;
  endSession: () => void;
  newSession: () => void;
  
  // Actions - Audio
  toggleListening: () => void;
  togglePause: () => void;
  setAudioDevice: (deviceId: string) => void;
  setAudioLevel: (level: number) => void;
  
  // Actions - Transcript
  addTranscriptSegment: (segment: TranscriptSegment) => void;
  setInterimTranscript: (text: string) => void;
  clearTranscript: () => void;
  
  // Actions - Detection
  addDetection: (detection: DetectionResult) => void;
  approveDetection: (id: string) => void;
  dismissDetection: (id: string) => void;
  
  // Actions - Display (v1.3: keep in queue)
  displayScripture: (id: string) => void;
  redisplayScripture: (id: string) => void;
  clearDisplay: () => void;
  removeFromApproved: (id: string) => void;
  
  // Actions - Verse Navigation (v1.3)
  goToNextVerse: () => Promise<void>;
  goToPrevVerse: () => Promise<void>;
  
  // Actions - Translation
  setTranslation: (translation: string) => void;
  changeDisplayTranslation: (translation: string) => Promise<void>;
  
  // Actions - Settings
  updateSettings: (settings: Partial<SessionSettings>) => void;
  
  // Export
  getExportData: () => unknown;
}

const AUTO_APPROVE_THRESHOLD = 0.85;

const DEFAULT_SETTINGS: SessionSettings = {
  translation: 'KJV',
  autoApproveHighConfidence: true,
  keyboardShortcutsEnabled: true,
  theme: 'dark',
  quickTranslations: ['KJV', 'WEB', 'ASV'],
  speechProvider: 'browser',
  enableLLMDetection: true,
};

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
  settings: DEFAULT_SETTINGS,
  
  // ========== SESSION ==========
  startSession: () => set({
    sessionId: `session_${Date.now()}`,
    startedAt: new Date(),
  }),
  
  endSession: () => set({ 
    isListening: false, 
    isPaused: false,
  }),
  
  // New session clears everything
  newSession: () => set({
    sessionId: `session_${Date.now()}`,
    startedAt: new Date(),
    transcript: [],
    interimTranscript: '',
    pendingQueue: [],
    approvedQueue: [],
    currentDisplay: null,
    detectionHistory: [],
    displayHistory: [],
    stats: { detected: 0, approved: 0, displayed: 0, dismissed: 0 },
  }),
  
  // ========== AUDIO ==========
  toggleListening: () => {
    const { isListening, sessionId } = get();
    if (!isListening && !sessionId) get().startSession();
    set({ isListening: !isListening, isPaused: false });
  },
  
  togglePause: () => set((s) => ({ isPaused: !s.isPaused })),
  setAudioDevice: (deviceId) => set({ selectedAudioDevice: deviceId }),
  setAudioLevel: (level) => set({ audioLevel: level }),
  
  // ========== TRANSCRIPT ==========
  addTranscriptSegment: (segment) => set((s) => ({ 
    transcript: [...s.transcript, segment], 
    interimTranscript: '' 
  })),
  setInterimTranscript: (text) => set({ interimTranscript: text }),
  clearTranscript: () => set({ transcript: [], interimTranscript: '' }),
  
  // ========== DETECTION ==========
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
    
    const shouldAutoApprove = settings.autoApproveHighConfidence && 
      detection.confidenceScore >= AUTO_APPROVE_THRESHOLD;
    
    set((state) => {
      // Check duplicates
      const exists = [...state.approvedQueue, ...state.pendingQueue]
        .some(q => q.reference.reference === item.reference.reference);
      if (exists) return state;
      
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
  
  // ========== DISPLAY (v1.3: KEEP in queue) ==========
  displayScripture: (id) => {
    const state = get();
    const item = state.approvedQueue.find((i) => i.id === id);
    if (!item) return;
    
    const displayItem = { ...item, displayedAt: new Date() };
    broadcastDisplay(displayItem);
    
    set((s) => ({
      currentDisplay: displayItem,
      displayHistory: [...s.displayHistory.filter(h => h.id !== id), displayItem],
      // KEEP in queue, just mark as displayed
      approvedQueue: s.approvedQueue.map(q => 
        q.id === id ? { ...q, displayedAt: new Date() } : q
      ),
      stats: { ...s.stats, displayed: s.stats.displayed + 1 },
    }));
  },
  
  redisplayScripture: (id) => {
    const state = get();
    const item = state.approvedQueue.find((i) => i.id === id);
    if (!item) return;
    
    const displayItem = { ...item, displayedAt: new Date() };
    broadcastDisplay(displayItem);
    set({ currentDisplay: displayItem });
  },
  
  clearDisplay: () => { 
    broadcastClear(); 
    set({ currentDisplay: null }); 
  },
  
  removeFromApproved: (id) => set((s) => ({
    approvedQueue: s.approvedQueue.filter((i) => i.id !== id),
  })),
  
  // ========== VERSE NAVIGATION (v1.3) ==========
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
  
  goToPrevVerse: async () => {
    const { currentDisplay, settings } = get();
    if (!currentDisplay) return;
    
    const ref = currentDisplay.reference;
    const prevVerseNum = (ref.verseStart || 2) - 1;
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
  
  // ========== TRANSLATION ==========
  setTranslation: (translation) => set((s) => ({
    settings: { ...s.settings, translation },
  })),
  
  changeDisplayTranslation: async (translation) => {
    const { currentDisplay } = get();
    if (!currentDisplay) return;
    
    const verse = await fetchVerse(currentDisplay.reference, translation);
    if (!verse || !verse.text) return;
    
    const newItem: QueueItem = {
      ...currentDisplay,
      verseText: verse.text,
      translation,
    };
    
    broadcastDisplay(newItem);
    set({ currentDisplay: newItem });
  },
  
  // ========== SETTINGS ==========
  updateSettings: (newSettings) => set((s) => ({ 
    settings: { ...s.settings, ...newSettings } 
  })),
  
  // ========== EXPORT ==========
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
