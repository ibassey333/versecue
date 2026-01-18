// ============================================
// Session Store v3.0 - With Groq Toggle
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TranscriptSegment, DetectionResult, QueueItem, ScriptureReference, SessionStats } from '@/types';
import { fetchVerse } from '@/lib/bible';

interface SessionSettings {
  translation: string;
  autoApproveHighConfidence: boolean;
  keyboardShortcutsEnabled: boolean;
  speechProvider: 'browser' | 'deepgram';
  enableGroqDetection: boolean; // NEW - off by default
}

interface SessionState {
  // Audio
  isListening: boolean;
  isPaused: boolean;
  audioLevel: number;
  selectedAudioDevice: string | null;
  
  // Transcript
  transcript: TranscriptSegment[];
  interimTranscript: string;
  
  // Detection queues
  pendingQueue: QueueItem[];
  approvedQueue: QueueItem[];
  detectionHistory: DetectionResult[];
  
  // Display
  currentDisplay: QueueItem | null;
  currentPart: number;
  totalParts: number;
  verseParts: string[];
  
  // Settings
  settings: SessionSettings;
  
  // Stats
  stats: SessionStats;
  
  // Actions
  toggleListening: () => void;
  togglePause: () => void;
  setAudioDevice: (deviceId: string) => void;
  setAudioLevel: (level: number) => void;
  
  addTranscriptSegment: (segment: TranscriptSegment) => void;
  setInterimTranscript: (text: string) => void;
  
  addDetection: (detection: DetectionResult) => void;
  approveDetection: (id: string) => void;
  dismissDetection: (id: string) => void;
  removeFromApproved: (id: string) => void;
  
  displayScripture: (id: string) => void;
  redisplayScripture: (id: string) => void;
  clearDisplay: () => void;
  goToNextVerse: () => void;
  goToPrevVerse: () => void;
  goToNextPart: () => void;
  goToPrevPart: () => void;
  
  updateSettings: (settings: Partial<SessionSettings>) => void;
  setTranslation: (translation: string) => void;
  changeDisplayTranslation: (translation: string) => Promise<void>;
  
  newSession: () => void;
}

const DEFAULT_SETTINGS: SessionSettings = {
  translation: 'KJV',
  autoApproveHighConfidence: true,
  keyboardShortcutsEnabled: true,
  speechProvider: 'browser', // Default to browser
  enableGroqDetection: false, // Default OFF to save costs
};

const DEFAULT_STATS: SessionStats = {
  detected: 0,
  approved: 0,
  displayed: 0,
  dismissed: 0,
};

// Split verse helper - threshold comes from display settings (default 70)
function splitVerseText(text: string, threshold: number = 70): string[] {
  const words = text.trim().split(/\s+/);
  const wordCount = words.length;
  
  // Don't split if under threshold
  if (wordCount <= threshold) {
    return [text];
  }
  
  // Determine number of parts
  const wordsPerPart = Math.min(threshold, 70);
  let numParts = Math.ceil(wordCount / wordsPerPart);
  numParts = Math.min(numParts, 5); // Max 5 parts
  
  // Try to split at sentence boundaries
  const sentences = text.split(/(?<=[.;!?])\s+/);
  const parts: string[] = [];
  
  if (sentences.length >= numParts) {
    const sentencesPerPart = Math.ceil(sentences.length / numParts);
    for (let i = 0; i < numParts; i++) {
      const start = i * sentencesPerPart;
      const end = Math.min(start + sentencesPerPart, sentences.length);
      const partText = sentences.slice(start, end).join(' ').trim();
      if (partText) parts.push(partText);
    }
  } else {
    // Fall back to word-based splitting
    const actualWordsPerPart = Math.ceil(words.length / numParts);
    for (let i = 0; i < numParts; i++) {
      const start = i * actualWordsPerPart;
      const end = Math.min(start + actualWordsPerPart, words.length);
      const partText = words.slice(start, end).join(' ').trim();
      if (partText) parts.push(partText);
    }
  }
  
  return parts.length > 0 ? parts : [text];
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      // Initial state
      isListening: false,
      isPaused: false,
      audioLevel: 0,
      selectedAudioDevice: null,
      transcript: [],
      interimTranscript: '',
      pendingQueue: [],
      approvedQueue: [],
      detectionHistory: [],
      currentDisplay: null,
      currentPart: 1,
      totalParts: 1,
      verseParts: [],
      settings: DEFAULT_SETTINGS,
      stats: DEFAULT_STATS,
      
      // Audio actions
      toggleListening: () => set((state) => ({ isListening: !state.isListening, isPaused: false })),
      togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
      setAudioDevice: (deviceId) => set({ selectedAudioDevice: deviceId }),
      setAudioLevel: (level) => set({ audioLevel: level }),
      
      // Transcript actions
      addTranscriptSegment: (segment) => set((state) => ({
        transcript: [...state.transcript, segment],
        interimTranscript: '',
      })),
      setInterimTranscript: (text) => set({ interimTranscript: text }),
      
      // Detection actions
      addDetection: (detection) => {
        const state = get();
        
        // Check for duplicates
        const isDupe = state.detectionHistory.some(
          (d) => d.reference.reference === detection.reference.reference &&
                 Date.now() - new Date(d.detectedAt).getTime() < 30000
        );
        if (isDupe) return;
        
        // Add to history
        const newHistory = [...state.detectionHistory, detection];
        
        // Create queue item
        const queueItem: QueueItem = {
          ...detection,
          approvedAt: null,
          displayedAt: null,
        };
        
        // Auto-approve high confidence or add to pending
        if (state.settings.autoApproveHighConfidence && detection.confidence === 'high') {
          set({
            detectionHistory: newHistory,
            approvedQueue: [...state.approvedQueue, { ...queueItem, approvedAt: new Date() }],
            stats: { ...state.stats, detected: state.stats.detected + 1, approved: state.stats.approved + 1 },
          });
        } else {
          set({
            detectionHistory: newHistory,
            pendingQueue: [...state.pendingQueue, queueItem],
            stats: { ...state.stats, detected: state.stats.detected + 1 },
          });
        }
      },
      
      approveDetection: (id) => set((state) => {
        const item = state.pendingQueue.find((q) => q.id === id);
        if (!item) return state;
        
        return {
          pendingQueue: state.pendingQueue.filter((q) => q.id !== id),
          approvedQueue: [...state.approvedQueue, { ...item, approvedAt: new Date() }],
          stats: { ...state.stats, approved: state.stats.approved + 1 },
        };
      }),
      
      dismissDetection: (id) => set((state) => ({
        pendingQueue: state.pendingQueue.filter((q) => q.id !== id),
        stats: { ...state.stats, dismissed: state.stats.dismissed + 1 },
      })),
      
      removeFromApproved: (id) => set((state) => ({
        approvedQueue: state.approvedQueue.filter((q) => q.id !== id),
      })),
      
      displayScripture: (id, splitThreshold = 70) => set((state) => {
        const item = state.approvedQueue.find((q) => q.id === id);
        if (!item) return state;
        
        const updatedItem = { ...item, displayedAt: new Date() };
        
        // Calculate verse parts
        const fullText = item.verseText || '';
        const parts = splitVerseText(fullText, splitThreshold);
        
        return {
          currentDisplay: updatedItem,
          currentPart: 1,
          totalParts: parts.length,
          verseParts: parts,
          approvedQueue: state.approvedQueue.map((q) => q.id === id ? updatedItem : q),
          stats: { ...state.stats, displayed: state.stats.displayed + 1 },
        };
      }),
      
      redisplayScripture: (id, splitThreshold = 70) => set((state) => {
        const item = state.approvedQueue.find((q) => q.id === id);
        if (!item) return state;
        
        // Recalculate parts
        const fullText = item.verseText || '';
        const parts = splitVerseText(fullText, splitThreshold);
        
        return { 
          currentDisplay: item,
          currentPart: 1,
          totalParts: parts.length,
          verseParts: parts,
        };
      }),
      
      clearDisplay: () => set({ 
        currentDisplay: null,
        currentPart: 1,
        totalParts: 1,
        verseParts: [],
      }),
      
      goToNextVerse: async () => {
        const state = get();
        if (!state.currentDisplay) return;
        
        const ref = state.currentDisplay.reference;
        const nextVerse = (ref.verseStart || 1) + 1;
        
        const newRef: ScriptureReference = {
          ...ref,
          verseStart: nextVerse,
          verseEnd: null,
          reference: `${ref.book} ${ref.chapter}:${nextVerse}`,
        };
        
        const verse = await fetchVerse(newRef, state.settings.translation);
        
        set({
          currentDisplay: {
            ...state.currentDisplay,
            reference: newRef,
            verseText: verse?.text || '',
          },
        });
      },
      
      goToPrevVerse: async () => {
        const state = get();
        if (!state.currentDisplay) return;
        
        const ref = state.currentDisplay.reference;
        const prevVerse = Math.max(1, (ref.verseStart || 1) - 1);
        
        const newRef: ScriptureReference = {
          ...ref,
          verseStart: prevVerse,
          verseEnd: null,
          reference: `${ref.book} ${ref.chapter}:${prevVerse}`,
        };
        
        const verse = await fetchVerse(newRef, state.settings.translation);
        
        set({
          currentDisplay: {
            ...state.currentDisplay,
            reference: newRef,
            verseText: verse?.text || '',
          },
        });
      },
      
      goToNextPart: () => set((state) => {
        if (!state.currentDisplay || state.currentPart >= state.totalParts) return state;
        return { currentPart: state.currentPart + 1 };
      }),
      
      goToPrevPart: () => set((state) => {
        if (!state.currentDisplay || state.currentPart <= 1) return state;
        return { currentPart: state.currentPart - 1 };
      }),
      
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings },
      })),
      
      setTranslation: (translation) => set((state) => ({
        settings: { ...state.settings, translation },
      })),
      
      changeDisplayTranslation: async (translation) => {
        const state = get();
        if (!state.currentDisplay) return;
        
        const verse = await fetchVerse(state.currentDisplay.reference, translation);
        
        set({
          currentDisplay: {
            ...state.currentDisplay,
            verseText: verse?.text || state.currentDisplay.verseText,
            translation: verse?.translation || translation,
          },
          settings: { ...state.settings, translation },
        });
      },
      
      newSession: () => set({
        transcript: [],
        interimTranscript: '',
        pendingQueue: [],
        approvedQueue: [],
        detectionHistory: [],
        currentDisplay: null,
        currentPart: 1,
        totalParts: 1,
        verseParts: [],
        stats: DEFAULT_STATS,
        isListening: false,
        isPaused: false,
      }),
    }),
    {
      name: 'versecue-session',
      partialize: (state) => ({
        settings: state.settings,
        selectedAudioDevice: state.selectedAudioDevice,
      }),
    }
  )
);
