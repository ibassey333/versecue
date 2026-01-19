import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { findBook, validateReference } from '@/lib/detection/books';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

const SYSTEM_PROMPT = `You are a Bible scripture search assistant. Given a user's search query, identify the most relevant Bible scripture references.

The user might search using:
- Partial phrases: "for god so loved" → John 3:16
- Topics/themes: "armor of god" → Ephesians 6:10-18
- Common names: "shepherd psalm" → Psalm 23
- Story names: "prodigal son" → Luke 15:11-32
- Descriptions: "love chapter" → 1 Corinthians 13
- Misspellings: "beatitutes" → Matthew 5:3-12

Return the TOP 3 most relevant matches (or fewer if not confident).

Return ONLY valid JSON:
{
  "results": [
    {
      "book": "John",
      "chapter": 3,
      "verseStart": 16,
      "verseEnd": null,
      "confidence": 0.95,
      "reasoning": "Famous verse about God's love",
      "preview": "For God so loved the world..."
    }
  ]
}

RULES:
1. Only return matches with confidence 0.75+
2. Return empty array if query doesn't match any scripture
3. Be accurate with verse ranges
4. Preview should be first ~50 characters of the verse

If uncertain: {"results": []}`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;
    
    if (!query || query.length < 3) {
      return NextResponse.json({ success: true, data: [] });
    }
    
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Search: "${query}"` },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    });
    
    const responseText = completion.choices[0]?.message?.content || '{"results": []}';
    
    let parsed;
    try {
      let jsonStr = responseText.trim();
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
      if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
      parsed = JSON.parse(jsonStr.trim());
    } catch {
      console.error('[AI Search] Failed to parse response:', responseText);
      return NextResponse.json({ success: true, data: [] });
    }
    
    const results = [];
    for (const ref of parsed.results || []) {
      const book = findBook(ref.book);
      if (!book) continue;
      if (!validateReference(book, ref.chapter, ref.verseStart)) continue;
      
      if (ref.confidence < 0.75) continue;
      
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
        preview: ref.preview || '',
        confidence: ref.confidence,
        reasoning: ref.reasoning || '',
      });
    }
    
    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error('[AI Search] Error:', error);
    return NextResponse.json({ success: true, data: [] });
  }
}
