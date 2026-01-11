// ============================================
// Detection Engine v2.3 - Reduced cooldown
// ============================================

import { ScriptureReference, DetectionResult } from '@/types';
import { parseScriptures } from './parser';
import { findPhraseMatches, PHRASE_COUNT } from './phrases';
import { fetchVerse } from '@/lib/bible';

// Track recent detections - shorter cooldown
const recentDetections = new Map<string, number>();
const COOLDOWN_MS = 10000; // 10 seconds (was 30)

function isDuplicate(ref: string): boolean {
  const lastSeen = recentDetections.get(ref);
  const now = Date.now();
  
  if (lastSeen && now - lastSeen < COOLDOWN_MS) {
    return true;
  }
  
  recentDetections.set(ref, now);
  return false;
}

/**
 * Detect scripture references in text
 */
export async function detectScriptures(text: string): Promise<DetectionResult[]> {
  const results: DetectionResult[] = [];
  const translation = 'KJV';
  
  console.log('[VerseCue Detection] Processing:', text.substring(0, 80));
  
  // Stage 1: Parser (deterministic)
  const parsed = parseScriptures(text);
  console.log('[VerseCue Detection] Parser found:', parsed.length);
  
  for (const result of parsed) {
    const ref = result.reference;
    
    if (isDuplicate(ref.reference)) continue;
    
    const verse = await fetchVerse(ref, translation);
    
    results.push({
      id: `det_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      reference: ref,
      matchedText: result.matchedText,
      confidence: 'high',
      confidenceScore: 0.95,
      detectionType: 'deterministic',
      detectedAt: new Date(),
      verseText: verse?.text || '',
      translation: verse?.translation || translation,
    });
  }
  
  // Stage 2: Phrase matching
  const phrases = findPhraseMatches(text);
  console.log('[VerseCue Detection] Phrases found:', phrases.length);
  
  for (const phrase of phrases.slice(0, 3)) {
    if (isDuplicate(phrase.reference)) continue;
    if (results.some(r => r.reference.reference === phrase.reference)) continue;
    
    const ref: ScriptureReference = {
      book: phrase.book,
      chapter: phrase.chapter,
      verseStart: phrase.verseStart,
      verseEnd: phrase.verseEnd,
      reference: phrase.reference,
    };
    
    const verse = await fetchVerse(ref, translation);
    
    results.push({
      id: `phr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      reference: ref,
      matchedText: phrase.phrase,
      confidence: 'high',
      confidenceScore: 0.88,
      detectionType: 'phrase',
      detectedAt: new Date(),
      verseText: verse?.text || '',
      translation: verse?.translation || translation,
    });
  }
  
  console.log('[VerseCue Detection] Total:', results.length);
  return results;
}

export { parseScriptures } from './parser';
export { findPhraseMatches, PHRASE_COUNT } from './phrases';
