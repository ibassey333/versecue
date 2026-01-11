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
