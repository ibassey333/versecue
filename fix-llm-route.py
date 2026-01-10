#!/usr/bin/env python3
"""
Fix LLM API route - proper string handling
"""
import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path) if os.path.dirname(path) else '.', exist_ok=True)
    with open(path, 'w') as f:
        f.write(content)
    print(f"✅ Created: {path}")

LLM_API_ROUTE = r'''import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { findBook, validateReference, containsTriggerKeywords } from '@/lib/detection/books';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

const SYSTEM_PROMPT = `You are a Bible scripture reference detector. Analyze sermon transcripts and identify Bible references.

EXPLICIT references directly name the book/chapter/verse.
IMPLICIT references require biblical knowledge (e.g., "As Paul wrote to the Corinthians about love" → 1 Corinthians 13).

RULES:
1. Only identify clear references
2. Assign confidence: 0.9+ explicit, 0.7-0.9 strong contextual, 0.5-0.7 probable
3. Below 0.5: don't include
4. Use Protestant canon (66 books)

Return ONLY valid JSON:
{"references": [{"reference": "1 Corinthians 13", "book": "1 Corinthians", "chapter": 13, "verseStart": null, "verseEnd": null, "confidence": 0.92, "reasoning": "Paul's letter about love"}]}

If no references: {"references": []}`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcript, context } = body;
    
    if (!transcript || !containsTriggerKeywords(transcript)) {
      return NextResponse.json({ success: true, data: [] });
    }
    
    const userMessage = context
      ? `Previous context: ${context}\n\nCurrent transcript:\n"${transcript}"`
      : `Transcript:\n"${transcript}"`;
    
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
      
      let referenceStr = `${book.name} ${ref.chapter}`;
      if (ref.verseStart) {
        referenceStr += `:${ref.verseStart}`;
        if (ref.verseEnd && ref.verseEnd !== ref.verseStart) {
          referenceStr += `-${ref.verseEnd}`;
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
    print("Fixing LLM API Route")
    print("=" * 60)
    
    write_file("src/app/api/detect-llm/route.ts", LLM_API_ROUTE)
    
    print("\n" + "=" * 60)
    print("Done! Run: npx tsc --noEmit")
    print("=" * 60)

if __name__ == "__main__":
    main()
