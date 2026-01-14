// ============================================
// Session Service - Save & Summarize via API
// Premium Edition with Review Support
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
  themes?: string[];
  scripture_groups?: ScriptureGroup[];
  application_points?: string[];
  needs_review?: string[];
  created_at?: string;
}

export interface ScriptureNote {
  reference: string;
  verse_text: string;
  context: string;
  timestamp: string;
}

export interface ScriptureGroup {
  theme: string;
  scriptures: string[];
  speakerNote?: string;
}

// Summarize transcript via API route
async function summarizeViaAPI(
  transcript: string, 
  scriptures: ScriptureNote[]
): Promise<{ 
  summary: string; 
  keyPoints: string[]; 
  themes: string[];
  scriptureGroups: ScriptureGroup[];
  applicationPoints: string[];
  needsReview: string[];
}> {
  try {
    const response = await fetch('/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript,
        scriptures: scriptures.map(s => ({
          reference: s.reference,
          verse_text: s.verse_text,
          context: s.context,
        })),
      }),
    });
    
    if (!response.ok) {
      throw new Error('API request failed');
    }
    
    const result = await response.json();
    
    if (result.success && result.data) {
      return {
        summary: result.data.summary || 'Summary unavailable',
        keyPoints: result.data.keyPoints || [],
        themes: result.data.themes || [],
        scriptureGroups: result.data.scriptureGroups || [],
        applicationPoints: result.data.applicationPoints || [],
        needsReview: result.data.needsReview || [],
      };
    }
    
    throw new Error(result.error || 'Unknown error');
  } catch (err) {
    console.error('[Sessions] Summary API error:', err);
    return {
      summary: 'Unable to generate summary. Please enter manually.',
      keyPoints: [],
      themes: [],
      scriptureGroups: [],
      applicationPoints: [],
      needsReview: ['AI summary failed - manual review required'],
    };
  }
}

// Generate session data (for preview/edit before save)
export async function generateSessionPreview(
  transcript: TranscriptSegment[],
  detections: DetectionResult[],
  startTime: Date
): Promise<SessionData> {
  const fullTranscript = transcript.map(t => t.text).join(' ');
  const durationMinutes = Math.round((Date.now() - startTime.getTime()) / 60000);
  
  // Build scripture notes
  const scriptures: ScriptureNote[] = detections.map(d => ({
    reference: d.reference.reference,
    verse_text: d.verseText || '',
    context: d.matchedText || '',
    timestamp: new Date(d.detectedAt).toLocaleTimeString(),
  }));
  
  // Get AI summary
  console.log('[Sessions] Generating preview via API...');
  const { summary, keyPoints, themes, scriptureGroups, applicationPoints, needsReview } = 
    await summarizeViaAPI(fullTranscript, scriptures);
  
  return {
    title: `Sermon - ${new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    })}`,
    date: new Date().toISOString(),
    duration_minutes: durationMinutes,
    transcript: fullTranscript,
    scriptures,
    summary,
    key_points: keyPoints,
    themes,
    scripture_groups: scriptureGroups,
    application_points: applicationPoints,
    needs_review: needsReview,
  };
}

// Save session to Supabase (after user edits)
export async function saveSession(sessionData: SessionData): Promise<SessionData | null> {
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
    return sessionData;
  }
  
  console.log('[Sessions] Saved:', data.id);
  return { ...sessionData, id: data.id };
}

// Legacy save function (generates and saves in one step)
export async function saveSessionLegacy(
  transcript: TranscriptSegment[],
  detections: DetectionResult[],
  startTime: Date
): Promise<SessionData | null> {
  const preview = await generateSessionPreview(transcript, detections, startTime);
  return saveSession(preview);
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

// Delete session
export async function deleteSession(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('[Sessions] Delete error:', error);
    return false;
  }
  
  return true;
}
