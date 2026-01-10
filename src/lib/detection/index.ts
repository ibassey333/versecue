// ============================================
// Detection Engine v1.3 - Fixed
// ============================================

import { ScriptureReference, DetectionResult } from '@/types';
import { parseScriptures } from './parser';
import { findPhraseMatches } from './phrases';
import { fetchVerse } from '@/lib/bible';

const recentDetections = new Map<string, number>();
const COOLDOWN_MS = 60000;

function isDuplicate(ref: string): boolean {
  const lastSeen = recentDetections.get(ref);
  if (lastSeen && Date.now() - lastSeen < COOLDOWN_MS) return true;
  recentDetections.set(ref, Date.now());
  return false;
}

export async function detectScriptures(text: string): Promise<DetectionResult[]> {
  const results: DetectionResult[] = [];
  
  // Stage 1: Deterministic parsing
  const parsed = parseScriptures(text);
  
  for (const result of parsed) {
    const ref = result.reference;
    if (isDuplicate(ref.reference)) continue;
    
    const verse = await fetchVerse(ref, 'KJV');
    
    results.push({
      id: `det_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      reference: ref,
      matchedText: result.matchedText,
      confidence: 'high',
      confidenceScore: 0.95,
      detectionType: 'deterministic',
      detectedAt: new Date(),
      verseText: verse?.text || '',
      translation: 'KJV',
    });
  }
  
  // Stage 2: Phrase matching (only if no deterministic matches)
  if (results.length === 0) {
    const phrases = findPhraseMatches(text);
    
    for (const phrase of phrases.slice(0, 2)) {
      if (isDuplicate(phrase.reference)) continue;
      
      const ref: ScriptureReference = {
        book: phrase.book,
        chapter: phrase.chapter,
        verseStart: phrase.verseStart,
        verseEnd: phrase.verseEnd,
        reference: phrase.reference,
      };
      
      const verse = await fetchVerse(ref, 'KJV');
      
      results.push({
        id: `phr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        reference: ref,
        matchedText: phrase.phrase,
        confidence: 'high',
        confidenceScore: 0.90,
        detectionType: 'phrase',
        detectedAt: new Date(),
        verseText: verse?.text || '',
        translation: 'KJV',
      });
    }
  }
  
  return results;
}
