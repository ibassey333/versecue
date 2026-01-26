import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { lyrics } = await request.json();
    
    console.log('[Identify] Received lyrics:', lyrics?.substring(0, 200));
    
    if (!lyrics || lyrics.trim().length < 10) {
      return NextResponse.json({ error: 'Not enough lyrics to identify' }, { status: 400 });
    }

    // Try both env variable names
    const groqApiKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY;
    
    if (!groqApiKey) {
      console.error('[Identify] No Groq API key found');
      return NextResponse.json({ error: 'Groq API key not configured' }, { status: 500 });
    }

    console.log('[Identify] Calling Groq LLM...');

    // Use Groq LLM to identify the song
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are a worship song identification expert. Given transcribed lyrics (which may be imperfect due to audio transcription), identify the song.

Respond ONLY with valid JSON in this exact format:
{
  "identified": true,
  "confidence": "high",
  "title": "Song Title",
  "artist": "Artist Name",
  "matchedLyrics": "The key lyrics that helped identify"
}

If you cannot identify the song, respond with:
{
  "identified": false,
  "confidence": "low",
  "title": "",
  "artist": ""
}

Focus on worship songs, hymns, and contemporary Christian music.`
          },
          {
            role: 'user',
            content: `Identify this worship song from these transcribed lyrics:\n\n"${lyrics}"`
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('[Identify] Groq error:', response.status, responseText);
      return NextResponse.json({ 
        error: 'Identification failed',
        details: responseText
      }, { status: 500 });
    }

    const data = JSON.parse(responseText);
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('[Identify] LLM Response:', content);
    
    // Parse JSON response
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        console.log('[Identify] Parsed result:', result.title, '-', result.artist);
        return NextResponse.json(result);
      }
    } catch (parseError) {
      console.error('[Identify] JSON parse error:', parseError, 'Content:', content);
    }
    
    return NextResponse.json({ 
      identified: false, 
      error: 'Could not parse identification result',
      rawContent: content
    });

  } catch (error: any) {
    console.error('[Identify] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
