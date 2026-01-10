#!/usr/bin/env python3
"""
Fix Groq SDK - move to server-side only
"""
import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path) if os.path.dirname(path) else '.', exist_ok=True)
    with open(path, 'w') as f:
        f.write(content)
    print(f"✅ Created: {path}")

# Client-side detection that calls API for LLM
DETECTION_INDEX = '''// ============================================
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
'''

# Server-side LLM detection API route
LLM_API_ROUTE = '''import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { findBook, validateReference, containsTriggerKeywords } from '@/lib/detection/books';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

const SYSTEM_PROMPT = \`You are a Bible scripture reference detector. Analyze sermon transcripts and identify Bible references.

EXPLICIT references directly name the book/chapter/verse.
IMPLICIT references require biblical knowledge (e.g., "As Paul wrote to the Corinthians about love" → 1 Corinthians 13).

RULES:
1. Only identify clear references
2. Assign confidence: 0.9+ explicit, 0.7-0.9 strong contextual, 0.5-0.7 probable
3. Below 0.5: don't include
4. Use Protestant canon (66 books)

Return ONLY valid JSON:
{"references": [{"reference": "1 Corinthians 13", "book": "1 Corinthians", "chapter": 13, "verseStart": null, "verseEnd": null, "confidence": 0.92, "reasoning": "Paul's letter about love"}]}

If no references: {"references": []}\`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcript, context } = body;
    
    if (!transcript || !containsTriggerKeywords(transcript)) {
      return NextResponse.json({ success: true, data: [] });
    }
    
    const userMessage = context
      ? \`Previous context: \${context}\\n\\nCurrent transcript:\\n"\${transcript}"\`
      : \`Transcript:\\n"\${transcript}"\`;
    
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    });
    
    const responseText = completion.choices[0]?.message?.content || '{"references": []}';
    
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      return NextResponse.json({ success: true, data: [] });
    }
    
    const results = [];
    for (const ref of parsed.references || []) {
      const book = findBook(ref.book);
      if (!book) continue;
      if (!validateReference(book, ref.chapter, ref.verseStart)) continue;
      if (ref.confidence < 0.6) continue;
      
      let referenceStr = \`\${book.name} \${ref.chapter}\`;
      if (ref.verseStart) {
        referenceStr += \`:\${ref.verseStart}\`;
        if (ref.verseEnd && ref.verseEnd !== ref.verseStart) {
          referenceStr += \`-\${ref.verseEnd}\`;
        }
      }
      
      results.push({
        reference: {
          book: book.name,
          chapter: ref.chapter,
          verseStart: ref.verseStart || null,
          verseEnd: ref.verseEnd || null,
          reference: referenceStr,
        },
        confidence: ref.confidence,
        reasoning: ref.reasoning,
      });
    }
    
    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error('LLM detection error:', error);
    return NextResponse.json({ success: true, data: [] });
  }
}
'''

def main():
    print("=" * 60)
    print("Fixing Groq SDK - Server-side Only")
    print("=" * 60)
    
    write_file("src/lib/detection/index.ts", DETECTION_INDEX)
    write_file("src/app/api/detect-llm/route.ts", LLM_API_ROUTE)
    
    # Remove the old llm-detector.ts that uses Groq directly
    if os.path.exists("src/lib/detection/llm-detector.ts"):
        os.remove("src/lib/detection/llm-detector.ts")
        print("✅ Removed: src/lib/detection/llm-detector.ts")
    
    print("\n" + "=" * 60)
    print("Done!")
    print("  1. Stop server: Ctrl+C")
    print("  2. Start server: npm run dev")
    print("  3. Hard refresh: Cmd+Shift+R")
    print("=" * 60)

if __name__ == "__main__":
    main()
