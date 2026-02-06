// ============================================
// Session Store v3.1 - Smart Worship Split
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TranscriptSegment, DetectionResult, QueueItem, ScriptureReference, SessionStats } from '@/types';
import { OBSSettings, DEFAULT_OBS_SETTINGS } from '@/types/obs';
import { fetchVerse } from '@/lib/bible';
import { smartSplitLyrics, DisplaySection } from '@/lib/lyrics';

interface SessionSettings {
  translation: string;
  autoApproveHighConfidence: boolean;
  keyboardShortcutsEnabled: boolean;
  speechProvider: 'browser' | 'deepgram';
  enableGroqDetection: boolean; // NEW - off by default
}

// ============================================
// Worship Mode State
// ============================================
type AppMode = 'sermon' | 'worship';

interface WorshipState {
  currentSong: any | null; // Will be Song type
  currentSectionIndex: number; // -1 = staged (not displaying), >= 0 = displaying
  displaySections: DisplaySection[]; // Smart-split sections
  setlistQueue: any[]; // Will be SetlistItem[]
  isDetecting: boolean;
  detectionResults: any[]; // Will be SongMatch[]
}

interface SessionState {
  // App Mode
  mode: AppMode;
  
  // Worship State
  worship: WorshipState;
  
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
  
  // OBS Integration
  obsSettings: OBSSettings;
  
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
  
  displayScripture: (id: string, splitThreshold?: number) => void;
  redisplayScripture: (id: string, splitThreshold?: number) => void;
  clearDisplay: () => void;
  goToNextVerse: (splitThreshold?: number) => void;
  goToPrevVerse: (splitThreshold?: number) => void;
  goToNextPart: () => void;
  goToPrevPart: () => void;
  
  updateSettings: (settings: Partial<SessionSettings>) => void;
  setTranslation: (translation: string) => void;
  changeDisplayTranslation: (translation: string) => Promise<void>;
  
  newSession: () => void;
  
  // Mode Actions
  setMode: (mode: AppMode) => void;
  toggleMode: () => void;
  
  // Worship Actions
  setCurrentSong: (song: any | null, splitConfig?: { maxLinesPerPart?: number; maxCharsPerPart?: number }) => void;
  nextSection: () => void;
  prevSection: () => void;
  goToSection: (index: number) => void;
  addToSetlist: (song: any) => void;
  removeFromSetlist: (songId: string) => void;
  reorderSetlist: (fromIndex: number, toIndex: number) => void;
  clearSetlist: () => void;
  setDetecting: (isDetecting: boolean) => void;
  setDetectionResults: (results: any[]) => void;
  
  // OBS Actions
  updateOBSSettings: (settings: OBSSettings) => void;
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

const DEFAULT_WORSHIP_STATE: WorshipState = {
  currentSong: null,
  currentSectionIndex: -1, // -1 = staged, not displaying
  displaySections: [],
  setlistQueue: [],
  isDetecting: false,
  detectionResults: [],
};

// Split verse helper - threshold = max words per part before splitting
function splitVerseText(text: string, maxWordsPerPart: number = 70): string[] {
  console.log('[Split] Called with threshold:', maxWordsPerPart);
  const words = text.trim().split(/\s+/);
  const wordCount = words.length;
  console.log('[Split] Word count:', wordCount);
  
  // Don't split if under threshold
  if (wordCount <= maxWordsPerPart) {
    console.log('[Split] No split needed');
    return [text];
  }
  
  // Calculate how many parts we need
  let numParts = Math.ceil(wordCount / maxWordsPerPart);
  numParts = Math.min(numParts, 5); // Max 5 parts
  
  // Calculate target words per part (distribute evenly)
  const targetWordsPerPart = Math.ceil(wordCount / numParts);
  
  // Try sentence-based splitting first
  const sentences = text.split(/(?<=[.;!?])\s+/);
  
  if (sentences.length >= numParts) {
    // Try to distribute sentences evenly
    const sentenceParts: string[] = [];
    const sentencesPerPart = Math.ceil(sentences.length / numParts);
    
    for (let i = 0; i < numParts; i++) {
      const start = i * sentencesPerPart;
      const end = Math.min(start + sentencesPerPart, sentences.length);
      const partText = sentences.slice(start, end).join(' ').trim();
      if (partText) sentenceParts.push(partText);
    }
    
    // Check if parts are reasonably balanced (no part less than 60% of average)
    const avgWords = wordCount / sentenceParts.length;
    const minAcceptable = avgWords * 0.6;
    console.log('[Split] Balance check: avg=', avgWords, 'min acceptable=', minAcceptable);
    console.log('[Split] Part sizes:', sentenceParts.map(p => p.split(/\s+/).length));
    const isBalanced = sentenceParts.every(part => 
      part.split(/\s+/).length >= minAcceptable
    );
    
    if (isBalanced) {
      return sentenceParts;
    }
    // If not balanced, fall through to word-based splitting
  }
  
  // Word-based splitting (guaranteed even distribution)
  const parts: string[] = [];
  for (let i = 0; i < numParts; i++) {
    const start = i * targetWordsPerPart;
    const end = Math.min(start + targetWordsPerPart, words.length);
    const partText = words.slice(start, end).join(' ').trim();
    if (partText) parts.push(partText);
  }
  
  return parts.length > 0 ? parts : [text];
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      // Initial state
      mode: 'sermon' as AppMode,
      worship: DEFAULT_WORSHIP_STATE,
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
      obsSettings: DEFAULT_OBS_SETTINGS,
      
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
        console.log('[displayScripture] Called with threshold:', splitThreshold);
        const item = state.approvedQueue.find((q) => q.id === id);
        if (!item) return state;
        
        const updatedItem = { ...item, displayedAt: new Date() };
        
        // Calculate verse parts
        const fullText = item.verseText || '';
        console.log('[displayScripture] Verse length:', fullText.split(/\s+/).length, 'words');
        const parts = splitVerseText(fullText, splitThreshold);
        console.log('[displayScripture] Split into', parts.length, 'parts');
        
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
      
      goToNextVerse: async (splitThreshold = 70) => {
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
        const newText = verse?.text || '';
        
        // Recalculate parts for new verse
        const parts = splitVerseText(newText, splitThreshold);
        
        set({
          currentDisplay: {
            ...state.currentDisplay,
            reference: newRef,
            verseText: newText,
          },
          currentPart: 1,
          totalParts: parts.length,
          verseParts: parts,
        });
      },
      
      goToPrevVerse: async (splitThreshold = 70) => {
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
        const newText = verse?.text || '';
        
        // Recalculate parts for new verse
        const parts = splitVerseText(newText, splitThreshold);
        
        set({
          currentDisplay: {
            ...state.currentDisplay,
            reference: newRef,
            verseText: newText,
          },
          currentPart: 1,
          totalParts: parts.length,
          verseParts: parts,
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
        obsSettings: DEFAULT_OBS_SETTINGS,
        isListening: false,
        isPaused: false,
        worship: DEFAULT_WORSHIP_STATE,
      }),
      
      // Mode Actions
      setMode: (mode) => set({ mode }),
      toggleMode: () => set((state) => ({ 
        mode: state.mode === 'sermon' ? 'worship' : 'sermon' 
      })),
      
      // ============================================
      // Worship Actions - Updated with Smart Split
      // ============================================
      
      /**
       * Set current song with smart splitting
       * Song is staged (currentSectionIndex = -1) until user clicks a section
       */
      setCurrentSong: (song, splitConfig) => set((state) => {
        if (!song) {
          return {
            worship: {
              ...state.worship,
              currentSong: null,
              currentSectionIndex: -1,
              displaySections: [],
            }
          };
        }
        
        // Smart split the lyrics
        const displaySections = smartSplitLyrics(song.lyrics || '', {
          maxLinesPerPart: splitConfig?.maxLinesPerPart ?? 4,
          maxCharsPerPart: splitConfig?.maxCharsPerPart ?? 150,
        });
        
        console.log('[Worship] Song loaded:', song.title);
        console.log('[Worship] Original sections:', song.lyrics?.split(/\n\n+/).filter(Boolean).length || 0);
        console.log('[Worship] Display sections after smart split:', displaySections.length);
        
        return {
          worship: {
            ...state.worship,
            currentSong: song,
            currentSectionIndex: -1, // Staged - not displaying until user clicks
            displaySections,
          }
        };
      }),
      
      /**
       * Navigate to next section in the flat display array
       */
      nextSection: () => set((state) => {
        const { displaySections, currentSectionIndex } = state.worship;
        if (displaySections.length === 0) return state;
        
        const maxIndex = displaySections.length - 1;
        const currentIndex = currentSectionIndex < 0 ? -1 : currentSectionIndex;
        const nextIndex = Math.min(currentIndex + 1, maxIndex);
        
        return {
          worship: {
            ...state.worship,
            currentSectionIndex: nextIndex,
          }
        };
      }),
      
      /**
       * Navigate to previous section in the flat display array
       */
      prevSection: () => set((state) => {
        const { currentSectionIndex } = state.worship;
        if (currentSectionIndex <= 0) return state;
        
        return {
          worship: {
            ...state.worship,
            currentSectionIndex: currentSectionIndex - 1,
          }
        };
      }),
      
      /**
       * Jump to a specific section index
       * Pass -1 to clear display (return to staged state)
       */
      goToSection: (index) => set((state) => {
        const { displaySections } = state.worship;
        
        // Allow -1 for clearing, or valid indices
        if (index < -1 || index >= displaySections.length) return state;
        
        return {
          worship: {
            ...state.worship,
            currentSectionIndex: index,
          }
        };
      }),
      
      addToSetlist: (song) => set((state) => ({
        worship: {
          ...state.worship,
          setlistQueue: [...state.worship.setlistQueue, {
            id: `setlist_${Date.now()}`,
            songId: song.id,
            song,
            order: state.worship.setlistQueue.length,
          }],
        }
      })),
      
      removeFromSetlist: (songId) => set((state) => ({
        worship: {
          ...state.worship,
          setlistQueue: state.worship.setlistQueue.filter(item => item.songId !== songId),
        }
      })),
      
      reorderSetlist: (fromIndex, toIndex) => set((state) => {
        const newQueue = [...state.worship.setlistQueue];
        const [moved] = newQueue.splice(fromIndex, 1);
        newQueue.splice(toIndex, 0, moved);
        return {
          worship: {
            ...state.worship,
            setlistQueue: newQueue.map((item, i) => ({ ...item, order: i })),
          }
        };
      }),
      
      clearSetlist: () => set((state) => ({
        worship: {
          ...state.worship,
          setlistQueue: [],
        }
      })),
      
      setDetecting: (isDetecting) => set((state) => ({
        worship: {
          ...state.worship,
          isDetecting,
        }
      })),
      
      setDetectionResults: (results) => set((state) => ({
        worship: {
          ...state.worship,
          detectionResults: results,
        }
      })),
      
      // OBS Actions
      updateOBSSettings: (obsSettings) => set({ obsSettings }),
    }),
    {
      name: 'versecue-session',
      partialize: (state) => ({
        settings: state.settings,
        selectedAudioDevice: state.selectedAudioDevice,
        mode: state.mode,
        obsSettings: state.obsSettings,
      }),
    }
  )
);
