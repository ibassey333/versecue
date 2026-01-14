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
    if (transcript.length > 10000) {
      const start = transcript.substring(0, 5000);
      const end = transcript.substring(transcript.length - 4000);
      processedTranscript = start + '\n\n[...middle portion omitted...]\n\n' + end;
    }
    
    // ============================================
    // PREMIUM PROMPT WITH SAFEGUARDS
    // ============================================
    const prompt = `You are a professional church secretary creating sermon notes. Your role is to FAITHFULLY DOCUMENT what was said - nothing more, nothing less.

═══════════════════════════════════════════════════════════
                    SERMON TRANSCRIPT
═══════════════════════════════════════════════════════════
${processedTranscript}

═══════════════════════════════════════════════════════════
              SCRIPTURES DETECTED (${scriptureCount})
═══════════════════════════════════════════════════════════
${scriptureRefs || 'None detected'}

═══════════════════════════════════════════════════════════
                   YOUR TASK
═══════════════════════════════════════════════════════════

Create sermon notes in JSON format following these STRICT RULES:

█ RULE 1: TRANSCRIPT-ANCHORED ONLY
- Every statement MUST come directly from the transcript
- If you cannot find it in the text, DO NOT include it
- Do not add interpretations or implications
- Do not fill gaps with assumptions

█ RULE 2: THEOLOGICAL PRECISION  
- This is a church sermon - word choice carries theological weight
- Preserve the speaker's EXACT theological language
- "Christ died for all" vs "Christ died for many" - these are different theologies
- When quoting, use the speaker's exact words
- Do not "improve" or "clarify" religious statements

█ RULE 3: CONSERVATIVE APPROACH
- When uncertain, OMIT rather than guess
- Better to miss a point than misrepresent one
- If a section is unclear, flag it in "needsReview"

█ RULE 4: VERBATIM PREFERENCE
- For key statements, use the speaker's exact words in "quotes"
- Clearly mark what is a quote vs paraphrase
- Key theological points should be quoted directly

█ RULE 5: NO INFERENCE
- Report WHAT WAS SAID, not what you think they meant
- Do not interpret scripture meanings beyond what the speaker said
- Do not add applications the speaker didn't mention

═══════════════════════════════════════════════════════════

Return ONLY this JSON structure (no markdown, no explanation):

{
  "summary": "2-3 paragraph summary using ONLY information from the transcript. Use quotes for key statements. Write in third person: 'The speaker explained that...' or 'The sermon focused on...'",
  
  "themes": ["Theme 1 from transcript", "Theme 2 from transcript"],
  
  "keyPoints": [
    "Key point 1 - use speaker's words where possible",
    "Key point 2 - cite relevant scripture if speaker connected them",
    "Key point 3",
    "Key point 4",
    "Key point 5"
  ],
  
  "scriptureGroups": [
    {
      "theme": "Theme name based on how speaker grouped them",
      "scriptures": ["Reference 1", "Reference 2"],
      "speakerNote": "Brief note on what speaker said about these (in quotes if possible)"
    }
  ],
  
  "applicationPoints": [
    "Only applications the speaker EXPLICITLY stated - use quotes"
  ],
  
  "needsReview": [
    "List any unclear sections or uncertain interpretations here",
    "Flag anything you're not 100% confident about"
  ]
}

REMEMBER: You are a secretary, not a theologian. Document faithfully. When in doubt, leave it out.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'user', content: prompt },
      ],
      temperature: 0.2, // Lower = more conservative
      max_tokens: 2500,
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
          summary: parsed.summary || '',
          keyPoints: parsed.keyPoints || [],
          themes: parsed.themes || [],
          scriptureGroups: parsed.scriptureGroups || [],
          applicationPoints: parsed.applicationPoints || [],
          needsReview: parsed.needsReview || [],
        },
      });
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr);
      return NextResponse.json({
        success: true,
        data: {
          summary: 'Summary generation completed but formatting failed.',
          keyPoints: [],
          themes: [],
          scriptureGroups: [],
          applicationPoints: [],
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
