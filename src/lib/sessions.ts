// ============================================
// Session Service - Save & Summarize with Groq
// ============================================

import { supabase } from './supabase';
import { TranscriptSegment, DetectionResult } from '@/types';

export interface SessionData {
  id?: string;
  title: string;
  date: string;
  duration_minutes: number;
  transcript: string;
  scriptures: ScriptureNote[];
  summary: string;
  key_points: string[];
  created_at?: string;
}

export interface ScriptureNote {
  reference: string;
  verse_text: string;
  context: string;
  timestamp: string;
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Summarize transcript with Groq
async function summarizeWithGroq(transcript: string, scriptures: ScriptureNote[]): Promise<{ summary: string; keyPoints: string[] }> {
  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
  
  if (!apiKey) {
    return {
      summary: 'AI summary unavailable - no API key configured.',
      keyPoints: ['Enable Groq API for automatic summaries'],
    };
  }
  
  const scriptureList = scriptures.map(s => s.reference).join(', ');
  
  const prompt = `You are a church note-taker. Based on this sermon transcript, create professional sermon notes.

TRANSCRIPT:
${transcript}

SCRIPTURES REFERENCED: ${scriptureList || 'None detected'}

Respond in this exact JSON format only (no markdown, no explanation):
{
  "summary": "A 2-3 paragraph summary of the sermon message, capturing the main theme and spiritual application. Write in third person (e.g., 'The pastor spoke about...')",
  "keyPoints": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"]
}

Important:
- Only include information from the transcript
- Keep summary concise but meaningful
- Extract 3-5 key points
- Be accurate, no hallucination`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Groq API error');
    }
    
    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '';
    
    // Clean JSON
    content = content.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(content);
    
    return {
      summary: parsed.summary || 'Summary unavailable',
      keyPoints: parsed.keyPoints || [],
    };
  } catch (err) {
    console.error('[Sessions] Groq error:', err);
    return {
      summary: 'Unable to generate summary. Please try again.',
      keyPoints: [],
    };
  }
}

// Save session to Supabase
export async function saveSession(
  transcript: TranscriptSegment[],
  detections: DetectionResult[],
  startTime: Date
): Promise<SessionData | null> {
  const fullTranscript = transcript.map(t => t.text).join(' ');
  const durationMinutes = Math.round((Date.now() - startTime.getTime()) / 60000);
  
  // Build scripture notes
  const scriptures: ScriptureNote[] = detections.map(d => ({
    reference: d.reference.reference,
    verse_text: d.verseText || '',
    context: d.matchedText,
    timestamp: new Date(d.detectedAt).toLocaleTimeString(),
  }));
  
  // Get AI summary
  console.log('[Sessions] Generating summary...');
  const { summary, keyPoints } = await summarizeWithGroq(fullTranscript, scriptures);
  
  const sessionData: SessionData = {
    title: `Sermon - ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`,
    date: new Date().toISOString(),
    duration_minutes: durationMinutes,
    transcript: fullTranscript,
    scriptures,
    summary,
    key_points: keyPoints,
  };
  
  // Save to Supabase
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      title: sessionData.title,
      date: sessionData.date,
      duration_minutes: sessionData.duration_minutes,
      transcript: sessionData.transcript,
      scriptures: JSON.stringify(sessionData.scriptures),
      summary: sessionData.summary,
      key_points: JSON.stringify(sessionData.key_points),
    })
    .select()
    .single();
  
  if (error) {
    console.error('[Sessions] Save error:', error);
    return sessionData; // Return data even if save fails
  }
  
  console.log('[Sessions] Saved:', data.id);
  return { ...sessionData, id: data.id };
}

// Get all sessions
export async function getSessions(): Promise<SessionData[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('[Sessions] Fetch error:', error);
    return [];
  }
  
  return data.map(d => ({
    id: d.id,
    title: d.title,
    date: d.date,
    duration_minutes: d.duration_minutes,
    transcript: d.transcript,
    scriptures: JSON.parse(d.scriptures || '[]'),
    summary: d.summary,
    key_points: JSON.parse(d.key_points || '[]'),
    created_at: d.created_at,
  }));
}

// Get single session
export async function getSession(id: string): Promise<SessionData | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('[Sessions] Fetch error:', error);
    return null;
  }
  
  return {
    id: data.id,
    title: data.title,
    date: data.date,
    duration_minutes: data.duration_minutes,
    transcript: data.transcript,
    scriptures: JSON.parse(data.scriptures || '[]'),
    summary: data.summary,
    key_points: JSON.parse(data.key_points || '[]'),
    created_at: data.created_at,
  };
}
