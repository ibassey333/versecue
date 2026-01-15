import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

interface ScriptureInput {
  reference: string;
  verse_text?: string;
  context?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcript, scriptures } = body;
    
    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid transcript' },
        { status: 400 }
      );
    }
    
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({
        success: true,
        data: {
          summary: 'AI summary unavailable - API key not configured.',
          keyPoints: ['Configure Groq API for automatic summaries'],
          themes: [],
          scriptureGroups: [],
          applicationPoints: [],
          needsReview: ['API configuration required'],
        },
      });
    }
    
    const scriptureList = (scriptures || []) as ScriptureInput[];
    const scriptureRefs = scriptureList.map(s => s.reference).join(', ');
    const scriptureCount = scriptureList.length;
    
    // Truncate transcript if too long
    let processedTranscript = transcript;
    if (transcript.length > 12000) {
      const start = transcript.substring(0, 6000);
      const end = transcript.substring(transcript.length - 5000);
      processedTranscript = start + '\n\n[...middle portion omitted...]\n\n' + end;
    }
    
    // ============================================
    // PREMIUM PROMPT - COMPREHENSIVE OUTPUT
    // ============================================
    const prompt = `You are an expert church secretary creating comprehensive, professional sermon notes. Your role is to FAITHFULLY DOCUMENT everything that was taught - capturing the full depth and richness of the message.

═══════════════════════════════════════════════════════════════════════════════
                              SERMON TRANSCRIPT
═══════════════════════════════════════════════════════════════════════════════
${processedTranscript}

═══════════════════════════════════════════════════════════════════════════════
                        SCRIPTURES DETECTED (${scriptureCount})
═══════════════════════════════════════════════════════════════════════════════
${scriptureRefs || 'None detected'}

═══════════════════════════════════════════════════════════════════════════════
                              YOUR TASK
═══════════════════════════════════════════════════════════════════════════════

Create COMPREHENSIVE sermon notes. This is a premium document that will be shared and preserved. Capture EVERYTHING of value.

█ SUMMARY REQUIREMENTS (2-3 substantial paragraphs):
- This is a SUMMARY of what was TAUGHT, not a description of what happened
- Paragraph 1: What is the MAIN MESSAGE? What is the speaker trying to teach? Start with "The sermon taught that..." or "The central message was..."
- Paragraph 2: What key scriptures and illustrations supported this message? How did they connect?
- Paragraph 3: What transformation or response is the speaker calling for?
- Use the speaker's own words in "quotes" for powerful statements
- DO NOT write "The sermon concluded with..." or "The speaker ended by..." - that's a description, not a summary
- DO NOT summarize the ending - summarize the TEACHING CONTENT

█ KEY POINTS REQUIREMENTS (7-10 points):
- Extract EVERY significant teaching point made
- Include the scripture reference when the speaker connected it to a point
- Use the speaker's exact words in quotes where impactful
- Each point should be a complete thought (1-2 sentences)
- Don't summarize multiple points into one - give each its own line
- Include theological insights, warnings, encouragements, and applications

█ THEMES (3-5 themes):
- Identify the major spiritual themes covered
- Use clear, descriptive names (e.g., "True Repentance", "Grace and Transformation")

█ APPLICATION POINTS (3-5 points):
- What did the speaker ask the congregation to DO or CHANGE?
- Include any questions the speaker posed for reflection
- Capture the "so what" of the sermon

█ STRICT ACCURACY RULES:
- Every statement MUST come directly from the transcript
- Use "quotes" for the speaker's exact words
- If uncertain about something, include it in needsReview
- Do NOT add interpretations or expand on what was said
- Do NOT hallucinate scriptures or points not mentioned
- Better to include more than miss something important

═══════════════════════════════════════════════════════════════════════════════

Return ONLY this JSON (no markdown, no explanation):

{
  "title": "A compelling title based on the main theme (not just 'Sermon')",
  
  "summary": "2-3 substantial paragraphs explaining WHAT WAS TAUGHT (not what happened). Start with the main message, then supporting points and scriptures, then the call to action. Someone reading this should understand the theological content, not just that 'a sermon was preached'.",
  
  "themes": ["Theme 1", "Theme 2", "Theme 3", "Theme 4"],
  
  "keyPoints": [
    "Key point 1 with 'quoted words' and scripture reference if applicable",
    "Key point 2 - complete thought capturing a teaching moment",
    "Key point 3",
    "Key point 4",
    "Key point 5",
    "Key point 6",
    "Key point 7",
    "Key point 8 (include more if the sermon was rich)",
    "Key point 9",
    "Key point 10"
  ],
  
  "applicationPoints": [
    "Practical application 1 - what should listeners do?",
    "Application 2 - any reflection questions posed",
    "Application 3"
  ],
  
  "quotableQuotes": [
    "Memorable quote 1 from the speaker",
    "Memorable quote 2"
  ],
  
  "needsReview": []
}

Remember: This is a PREMIUM document. Be thorough, accurate, and comprehensive. Capture the full richness of the message.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'user', content: prompt },
      ],
      temperature: 0.25,
      max_tokens: 3500,
    });
    
    const responseText = completion.choices[0]?.message?.content || '{}';
    
    try {
      let cleanJson = responseText.trim();
      if (cleanJson.startsWith('```json')) cleanJson = cleanJson.slice(7);
      if (cleanJson.startsWith('```')) cleanJson = cleanJson.slice(3);
      if (cleanJson.endsWith('```')) cleanJson = cleanJson.slice(0, -3);
      cleanJson = cleanJson.trim();
      
      const parsed = JSON.parse(cleanJson);
      
      return NextResponse.json({
        success: true,
        data: {
          title: parsed.title || 'Sermon Notes',
          summary: parsed.summary || '',
          keyPoints: parsed.keyPoints || [],
          themes: parsed.themes || [],
          applicationPoints: parsed.applicationPoints || [],
          quotableQuotes: parsed.quotableQuotes || [],
          needsReview: parsed.needsReview || [],
        },
      });
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr);
      return NextResponse.json({
        success: true,
        data: {
          title: 'Sermon Notes',
          summary: 'Summary generation completed but formatting failed.',
          keyPoints: [],
          themes: [],
          applicationPoints: [],
          quotableQuotes: [],
          needsReview: ['AI response parsing failed - manual entry required'],
        },
      });
    }
  } catch (error) {
    console.error('Summarize API error:', error);
    return NextResponse.json(
      { success: false, error: 'Summarization failed' },
      { status: 500 }
    );
  }
}
