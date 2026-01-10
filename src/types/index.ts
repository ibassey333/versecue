// ============================================
// VerseCue Type Definitions
// ============================================

// Scripture reference parsed from text
export interface ScriptureReference {
  book: string;
  chapter: number;
  verseStart: number | null;
  verseEnd: number | null;
  reference: string; // Formatted string like "John 3:16" or "Romans 8:28-30"
}

// Detection result with confidence scoring
export interface DetectionResult {
  id: string;
  reference: ScriptureReference;
  matchedText: string; // Original text that was matched
  confidence: 'high' | 'medium' | 'low';
  confidenceScore: number; // 0.0 - 1.0
  detectionType: 'deterministic' | 'llm';
  reasoning?: string; // LLM explanation for contextual matches
  alternatives?: ScriptureReference[]; // Other possible matches for low confidence
  detectedAt: Date;
  verseText?: string; // Fetched verse content
  translation?: string;
}

// Queue item for operator approval
export interface QueueItem extends DetectionResult {
  status: 'pending' | 'approved' | 'dismissed';
  approvedAt?: Date;
  displayedAt?: Date;
}

// Session state
export interface ServiceSession {
  id: string;
  startedAt: Date;
  endedAt?: Date;
  transcript: TranscriptSegment[];
  detections: DetectionResult[];
  displayed: QueueItem[];
  isListening: boolean;
  isPaused: boolean; // Preaching mode off
}

// Transcript segment with timestamp
export interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: Date;
  isFinal: boolean;
  confidence: number;
}

// Bible verse from API
export interface BibleVerse {
  reference: string;
  text: string;
  translation: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  cachedAt?: Date;
}

// Audio input device
export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput';
}

// Application settings
export interface AppSettings {
  defaultTranslation: string;
  autoApproveHighConfidence: boolean;
  showTranscript: boolean;
  displayTheme: 'dark' | 'light' | 'auto';
  keyboardShortcutsEnabled: boolean;
}

// LLM detection request
export interface LLMDetectionRequest {
  transcript: string;
  context?: string; // Previous context if available
}

// LLM detection response (structured)
export interface LLMDetectionResponse {
  references: Array<{
    reference: string;
    book: string;
    chapter: number;
    verseStart?: number;
    verseEnd?: number;
    confidence: number;
    type: 'explicit' | 'implicit';
    reasoning: string;
  }>;
}

// Book metadata for parsing
export interface BookMetadata {
  name: string;
  aliases: string[];
  chapters: number;
  testament: 'old' | 'new';
}

// Export format options
export interface ExportOptions {
  format: 'markdown' | 'json' | 'pdf';
  includeTranscript: boolean;
  includeSummary: boolean;
  includeTimestamps: boolean;
}

// Service summary (AI-generated)
export interface ServiceSummary {
  title: string;
  date: Date;
  duration: string;
  scriptureCount: number;
  scriptures: Array<{
    reference: string;
    displayedAt: Date;
    context?: string;
  }>;
  themes: string[];
  summary: string;
  transcript?: string;
}

// API response types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// WebSocket message types for real-time updates
export type WSMessageType = 
  | 'transcript' 
  | 'detection' 
  | 'approved' 
  | 'displayed' 
  | 'cleared'
  | 'session_start'
  | 'session_end';

export interface WSMessage {
  type: WSMessageType;
  payload: unknown;
  timestamp: Date;
}

// Deepgram transcript event
export interface DeepgramTranscript {
  channel: {
    alternatives: Array<{
      transcript: string;
      confidence: number;
      words: Array<{
        word: string;
        start: number;
        end: number;
        confidence: number;
      }>;
    }>;
  };
  is_final: boolean;
  speech_final: boolean;
}
