// ============================================
// Scripture Detection Engine (Client-safe)
// ============================================

import { DetectionResult, ScriptureReference } from '@/types';
import { parseScriptures, mightContainScripture } from './parser';
import { containsTriggerKeywords } from './books';

const recentDetections = new Map<string, number>();
const COOLDOWN_MS = 60000;

function generateId(): string {
  return `det_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function isOnCooldown(reference: string): boolean {
  const lastDetected = recentDetections.get(reference);
  if (!lastDetected) return false;
  return Date.now() - lastDetected < COOLDOWN_MS;
}

function recordDetection(reference: string): void {
  recentDetections.set(reference, Date.now());
  if (recentDetections.size > 100) {
    const now = Date.now();
    const entries = Array.from(recentDetections.entries());
    for (const [ref, time] of entries) {
      if (now - time > COOLDOWN_MS) {
        recentDetections.delete(ref);
      }
    }
  }
}

function getConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.85) return 'high';
  if (score >= 0.65) return 'medium';
  return 'low';
}

async function fetchVerseText(reference: ScriptureReference): Promise<{ text?: string; translation?: string }> {
  try {
    const response = await fetch(`/api/verses?reference=${encodeURIComponent(reference.reference)}`);
    if (response.ok) {
      const data = await response.json();
      return { text: data.data?.text, translation: data.data?.translation };
    }
  } catch (e) {
    console.error('Failed to fetch verse:', e);
  }
  return {};
}

async function detectWithLLMApi(transcript: string, context?: string): Promise<Array<{
  reference: ScriptureReference;
  confidence: number;
  reasoning: string;
}>> {
  try {
    const response = await fetch('/api/detect-llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, context }),
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.data || [];
    }
  } catch (e) {
    console.error('LLM detection failed:', e);
  }
  return [];
}

export async function detectScriptures(
  transcript: string,
  options: {
    context?: string;
    skipLLM?: boolean;
    fetchVerses?: boolean;
  } = {}
): Promise<DetectionResult[]> {
  const results: DetectionResult[] = [];
  
  const mightHaveScripture = mightContainScripture(transcript);
  const hasTriggerKeywords = containsTriggerKeywords(transcript);
  
  if (!mightHaveScripture && !hasTriggerKeywords) {
    return results;
  }
  
  // Stage 1: Deterministic parsing (client-side)
  if (mightHaveScripture) {
    const parsed = parseScriptures(transcript);
    
    for (const { reference, matchedText } of parsed) {
      if (isOnCooldown(reference.reference)) continue;
      
      let verseText: string | undefined;
      let translation: string | undefined;
      
      if (options.fetchVerses) {
        const verse = await fetchVerseText(reference);
        verseText = verse.text;
        translation = verse.translation;
      }
      
      results.push({
        id: generateId(),
        reference,
        matchedText,
        confidence: 'high',
        confidenceScore: 0.95,
        detectionType: 'deterministic',
        detectedAt: new Date(),
        verseText,
        translation,
      });
      
      recordDetection(reference.reference);
    }
  }
  
  // Stage 2: LLM detection via API (server-side)
  if (results.length === 0 && hasTriggerKeywords && !options.skipLLM) {
    const llmResults = await detectWithLLMApi(transcript, options.context);
    
    for (const { reference, confidence, reasoning } of llmResults) {
      if (isOnCooldown(reference.reference)) continue;
      
      let verseText: string | undefined;
      let translation: string | undefined;
      
      if (options.fetchVerses) {
        const verse = await fetchVerseText(reference);
        verseText = verse.text;
        translation = verse.translation;
      }
      
      results.push({
        id: generateId(),
        reference,
        matchedText: transcript.substring(0, 100),
        confidence: getConfidenceLevel(confidence),
        confidenceScore: confidence,
        detectionType: 'llm',
        reasoning,
        detectedAt: new Date(),
        verseText,
        translation,
      });
      
      recordDetection(reference.reference);
    }
  }
  
  return results;
}

export function clearCooldowns(): void {
  recentDetections.clear();
}

export * from './books';
export * from './normalizer';
export * from './parser';
