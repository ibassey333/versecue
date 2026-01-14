import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { findBook, validateReference } from '@/lib/detection/books';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

const SYSTEM_PROMPT = `You are a CONSERVATIVE Bible scripture reference detector. Analyze sermon transcripts and identify Bible references.

CRITICAL RULES:
1. Only return matches you are HIGHLY confident about (confidence 0.80+)
2. It is BETTER to miss a reference than to return a false positive
3. If the text could plausibly NOT be a scripture reference, return nothing
4. Do not try to find scripture in greetings, casual speech, or generic statements

EXPLICIT references directly name the book/chapter/verse (e.g., "John 3:16")
IMPLICIT references require biblical knowledge (e.g., "the prodigal son" → Luke 15)

What to DETECT:
- Direct scripture citations
- Well-known biblical stories/parables mentioned by name
- Famous biblical phrases with clear origin

What to IGNORE:
- Generic religious language ("God is good", "have faith", "amen")
- Greetings and casual speech
- Vague spiritual references without clear biblical origin

Return ONLY valid JSON:
{"references": [{"reference": "Luke 15:11-32", "book": "Luke", "chapter": 15, "verseStart": 11, "verseEnd": 32, "confidence": 0.92, "reasoning": "Explicit reference to prodigal son parable"}]}

If no clear references found: {"references": []}
When in doubt, return empty.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcript } = body;
    
    // Only filter by minimum length
    if (!transcript || transcript.length < 20) {
      return NextResponse.json({ success: true, data: [] });
    }
    
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Transcript: "${transcript}"` },
      ],
      temperature: 0.2,  // Lower = more conservative
      max_tokens: 1024,
    });
    
    const responseText = completion.choices[0]?.message?.content || '{"references": []}';
    
    let parsed;
    try {
      // Clean up response
      let jsonStr = responseText.trim();
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
      if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
      parsed = JSON.parse(jsonStr.trim());
    } catch {
      return NextResponse.json({ success: true, data: [] });
    }
    
    const results = [];
    for (const ref of parsed.references || []) {
      const book = findBook(ref.book);
      if (!book) continue;
      if (!validateReference(book, ref.chapter, ref.verseStart)) continue;
      
      // Higher confidence threshold
      if (ref.confidence < 0.80) continue;
      
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
