// ============================================
// Detection Engine v3.0 - With Groq AI
// ============================================

import { ScriptureReference, DetectionResult } from '@/types';
import { parseScriptures } from './parser';
import { findPhraseMatches, PHRASE_COUNT } from './phrases';
import { detectWithGroq } from './groq';
import { fetchVerse } from '@/lib/bible';

// Track recent detections
const recentDetections = new Map<string, number>();
const COOLDOWN_MS = 10000; // 10 seconds

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
 * 3-stage pipeline:
 * 1. Parser (deterministic) - "John 3:16" → 95% confidence
 * 2. Phrases (quoted text) - "for God so loved" → 88% confidence  
 * 3. Groq AI (implicit) - "prodigal son" → variable confidence
 */
export async function detectScriptures(text: string): Promise<DetectionResult[]> {
  const results: DetectionResult[] = [];
  const translation = 'KJV';
  
  console.log('[VerseCue Detection] Processing:', text.substring(0, 60));
  
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
  
  // Stage 3: Groq AI (implicit references) - only if enabled and we haven't found much
  const groqEnabled = process.env.NEXT_PUBLIC_GROQ_API_KEY && process.env.NEXT_PUBLIC_ENABLE_LLM_DETECTION === 'true';
  
  if (groqEnabled && results.length < 2 && text.length > 30) {
    console.log('[VerseCue Detection] Running Groq AI detection...');
    
    try {
      const groqResults = await detectWithGroq(text);
      
      for (const groq of groqResults) {
        if (isDuplicate(groq.reference.reference)) continue;
        if (results.some(r => r.reference.reference === groq.reference.reference)) continue;
        
        const verse = await fetchVerse(groq.reference, translation);
        
        const confidence = groq.confidence >= 0.85 ? 'high' : groq.confidence >= 0.7 ? 'medium' : 'low';
        
        results.push({
          id: `ai_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          reference: groq.reference,
          matchedText: groq.matchedText,
          confidence,
          confidenceScore: groq.confidence,
          detectionType: 'llm',
          detectedAt: new Date(),
          verseText: verse?.text || '',
          translation: verse?.translation || translation,
        });
        
        console.log('[VerseCue Detection] Groq found:', groq.reference.reference, '(' + groq.matchedText + ')');
      }
    } catch (err) {
      console.error('[VerseCue Detection] Groq error:', err);
    }
  }
  
  console.log('[VerseCue Detection] Total results:', results.length);
  return results;
}

export { parseScriptures } from './parser';
export { findPhraseMatches, PHRASE_COUNT } from './phrases';
export { detectWithGroq } from './groq';
