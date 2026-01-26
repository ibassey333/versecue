// ============================================
// VerseCue Type Definitions v2.0
// ============================================

export interface ScriptureReference {
  book: string;
  chapter: number;
  verseStart: number | null;
  verseEnd: number | null;
  reference: string;
}

export interface DetectionResult {
  id: string;
  reference: ScriptureReference;
  matchedText: string;
  confidence: 'high' | 'medium' | 'low';
  confidenceScore: number;
  detectionType: 'deterministic' | 'phrase' | 'llm';
  reasoning?: string;
  detectedAt: Date;
  verseText?: string;
  translation?: string;
}

export interface QueueItem {
  id: string;
  reference: ScriptureReference;
  verseText?: string;
  translation?: string;
  confidence: 'high' | 'medium' | 'low';
  confidenceScore: number;
  detectionType: 'deterministic' | 'phrase' | 'llm';
  detectedAt: Date;
  displayedAt?: Date | null;
  approvedAt?: Date | null;
}

export interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: Date;
  isFinal: boolean;
  confidence?: number;
}

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput';
}

export interface BibleVerse {
  reference: string;
  text: string;
  translation: string;
  book: string;
  chapter: number;
  verse?: number;
  verseStart: number;
  verseEnd: number | null;
  cachedAt?: Date;
}

export interface Translation {
  id: string;
  name: string;
  abbreviation: string;
  source: 'local' | 'api-bible' | 'bible-api';
  enabled: boolean;
  apiId?: string; // API.Bible ID
}

export interface SessionSettings {
  translation: string;
  autoApproveHighConfidence: boolean;
  keyboardShortcutsEnabled: boolean;
  theme: 'dark' | 'light';
  quickTranslations: string[]; // User's preferred quick buttons
  speechProvider: 'browser' | 'deepgram';
  deepgramApiKey?: string;
  enableLLMDetection: boolean;
}

export interface BookMetadata {
  name: string;
  aliases: string[];
  chapters: number;
  testament: 'old' | 'new';
}

// Session Stats
export interface SessionStats {
  detected: number;
  approved: number;
  displayed: number;
  dismissed: number;
}


// ============================================
// Worship Mode Types
// ============================================

export type AppMode = 'sermon' | 'worship';

export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  lyrics: string;
  sections?: SongSection[];
  source: 'local' | 'lrclib' | 'ccli' | 'custom';
  sourceId?: string; // ID from external source
  organizationId?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  isFavorite?: boolean;
  tags?: string[];
}

export interface SongSection {
  type: 'verse' | 'chorus' | 'bridge' | 'pre-chorus' | 'outro' | 'intro' | 'tag' | 'other';
  label: string; // "Verse 1", "Chorus", etc.
  lyrics: string;
  order: number;
}

export interface SongMatch {
  song: Song;
  confidence: number;
  matchedLyrics?: string;
  source: 'local' | 'lrclib' | 'ccli' | 'custom';
}

export interface SetlistItem {
  id: string;
  songId: string;
  song?: Song;
  order: number;
  notes?: string;
}

export interface Setlist {
  id: string;
  name: string;
  description?: string;
  items: SetlistItem[];
  organizationId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  serviceDate?: Date;
}

export interface WorshipDisplayState {
  mode: 'waiting' | 'displaying' | 'detecting';
  currentSong: Song | null;
  currentSection: number;
  totalSections: number;
}

export interface LRCLibSearchResult {
  id: number;
  name: string;
  trackName: string;
  artistName: string;
  albumName?: string;
  duration?: number;
  instrumental: boolean;
  plainLyrics?: string;
  syncedLyrics?: string;
}
