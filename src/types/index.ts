// ============================================
// VerseCue Type Definitions
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
  detectionType: 'deterministic' | 'llm' | 'phrase';
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
  detectionType: 'deterministic' | 'llm' | 'phrase';
  detectedAt: Date;
  displayedAt?: Date;
}

export interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: Date;
  isFinal: boolean;
  confidence?: number;
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

export interface BookMetadata {
  name: string;
  aliases: string[];
  chapters: number;
  versesPerChapter?: number[];
  testament: 'old' | 'new';
}


export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput';
}
