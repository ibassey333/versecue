// ============================================
// Groq AI Detection - Implicit Scripture References
// "prodigal son" → Luke 15
// "David and Goliath" → 1 Samuel 17
// ============================================

import { ScriptureReference } from '@/types';

interface GroqDetectionResult {
  reference: ScriptureReference;
  matchedText: string;
  confidence: number;
  explanation: string;
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `You are a Bible scripture detection assistant. Your job is to identify implicit references to Bible passages in sermon text.

When given text, identify any phrases that refer to specific Bible stories, parables, or passages WITHOUT explicitly mentioning chapter and verse.

Examples of implicit references:
- "prodigal son" → Luke 15:11-32
- "David and Goliath" → 1 Samuel 17
- "good Samaritan" → Luke 10:25-37
- "burning bush" → Exodus 3
- "valley of the shadow of death" → Psalm 23:4
- "faith of a mustard seed" → Matthew 17:20
- "the last supper" → Matthew 26:17-30
- "road to Damascus" → Acts 9
- "garden of Gethsemane" → Matthew 26:36-46
- "loaves and fishes" → John 6:1-14
- "coat of many colors" → Genesis 37
- "writing on the wall" → Daniel 5
- "den of lions" → Daniel 6
- "fiery furnace" → Daniel 3
- "Jonah and the whale" → Jonah 1-2
- "walls of Jericho" → Joshua 6
- "parting of the Red Sea" → Exodus 14
- "Noah's ark" → Genesis 6-9
- "tower of Babel" → Genesis 11
- "ten commandments" → Exodus 20

Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{
  "detections": [
    {
      "phrase": "the exact phrase from the text",
      "book": "Book Name",
      "chapter": 1,
      "verseStart": 1,
      "verseEnd": null,
      "confidence": 0.95,
      "explanation": "Brief explanation of why this matches"
    }
  ]
}

If no implicit references are found, respond with: {"detections": []}

Important:
- Only detect IMPLICIT references (not explicit like "John 3:16")
- Confidence should be 0.7-1.0
- Be conservative - only return high-confidence matches`;

export async function detectWithGroq(text: string): Promise<GroqDetectionResult[]> {
  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
  
  if (!apiKey) {
    console.log('[VerseCue Groq] No API key configured');
    return [];
  }
  
  // Skip very short text
  if (text.length < 20) {
    return [];
  }
  
  console.log('[VerseCue Groq] Analyzing text:', text.substring(0, 60) + '...');
  
  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Analyze this sermon text for implicit Bible references:

"${text}"` }
        ],
        max_tokens: 500,
        temperature: 0.1, // Low temperature for consistent results
      }),
    });
    
    if (!response.ok) {
      console.error('[VerseCue Groq] API error:', response.status);
      return [];
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('[VerseCue Groq] Response:', content.substring(0, 100));
    
    // Parse JSON response
    try {
      // Clean up response - remove markdown code blocks if present
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
      }
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
      }
      jsonStr = jsonStr.trim();
      
      const parsed = JSON.parse(jsonStr);
      
      if (!parsed.detections || !Array.isArray(parsed.detections)) {
        return [];
      }
      
      const results: GroqDetectionResult[] = parsed.detections
        .filter((d: any) => d.book && d.chapter && d.confidence >= 0.7)
        .map((d: any) => {
          let refString = `${d.book} ${d.chapter}`;
          if (d.verseStart) {
            refString += `:${d.verseStart}`;
            if (d.verseEnd && d.verseEnd !== d.verseStart) {
              refString += `-${d.verseEnd}`;
            }
          }
          
          return {
            reference: {
              book: d.book,
              chapter: d.chapter,
              verseStart: d.verseStart || null,
              verseEnd: d.verseEnd || null,
              reference: refString,
            },
            matchedText: d.phrase,
            confidence: d.confidence,
            explanation: d.explanation,
          };
        });
      
      console.log('[VerseCue Groq] Detections:', results.length);
      return results;
      
    } catch (parseErr) {
      console.error('[VerseCue Groq] JSON parse error:', parseErr);
      return [];
    }
    
  } catch (err) {
    console.error('[VerseCue Groq] Fetch error:', err);
    return [];
  }
}
