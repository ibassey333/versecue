// ============================================
// Premium Session Service
// Save, Summarize, and Export Sermon Notes
// ============================================

import { createClient } from '@/lib/supabase/client';
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
  application_points?: string[];
  quotable_quotes?: string[];
  needs_review?: string[];
  created_at?: string;
}

export interface ScriptureNote {
  reference: string;
  verse_text: string;
  context: string;
  timestamp: string;
}

// ============================================
// Summarize via API (secure, server-side)
// ============================================
async function summarizeViaAPI(
  transcript: string, 
  scriptures: ScriptureNote[]
): Promise<{ 
  title: string;
  summary: string; 
  keyPoints: string[]; 
  themes: string[];
  applicationPoints: string[];
  quotableQuotes: string[];
  needsReview: string[];
}> {
  try {
    console.log('[Sessions] Calling /api/summarize...');
    
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
    
    console.log('[Sessions] API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Sessions] API error:', errorText);
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('[Sessions] API result:', result.success ? 'Success' : 'Failed');
    
    if (result.success && result.data) {
      return {
        title: result.data.title || `Sermon - ${new Date().toLocaleDateString()}`,
        summary: result.data.summary || 'Summary unavailable',
        keyPoints: result.data.keyPoints || [],
        themes: result.data.themes || [],
        applicationPoints: result.data.applicationPoints || [],
        quotableQuotes: result.data.quotableQuotes || [],
        needsReview: result.data.needsReview || [],
      };
    }
    
    throw new Error(result.error || 'Unknown API error');
  } catch (err) {
    console.error('[Sessions] Summary API error:', err);
    return {
      title: `Sermon - ${new Date().toLocaleDateString('en-US', { 
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' 
      })}`,
      summary: 'Unable to generate AI summary. Please enter manually or try again.',
      keyPoints: [],
      themes: [],
      applicationPoints: [],
      quotableQuotes: [],
      needsReview: ['AI summary failed - manual review required'],
    };
  }
}

// ============================================
// Generate Preview (for editing before save)
// ============================================
export async function generateSessionPreview(
  transcript: TranscriptSegment[],
  detections: DetectionResult[],
  startTime: Date
): Promise<SessionData> {
  console.log('[Sessions] Generating preview...');
  console.log('[Sessions] Transcript segments:', transcript.length);
  console.log('[Sessions] Detections:', detections.length);
  
  const fullTranscript = transcript.map(t => t.text).join(' ');
  const durationMinutes = Math.round((Date.now() - startTime.getTime()) / 60000);
  
  // Build scripture notes with deduplication
  const seenRefs = new Set<string>();
  const scriptures: ScriptureNote[] = [];
  
  for (const d of detections) {
    // Normalize reference (handle Psalm vs Psalms)
    const normalizedRef = d.reference.reference.replace(/^Psalms/, 'Psalm');
    
    if (!seenRefs.has(normalizedRef)) {
      seenRefs.add(normalizedRef);
      scriptures.push({
        reference: d.reference.reference,
        verse_text: d.verseText || '',
        context: d.matchedText || '',
        timestamp: new Date(d.detectedAt).toLocaleTimeString(),
      });
    }
  }
  
  console.log('[Sessions] Unique scriptures:', scriptures.length);
  
  // Get AI summary
  const { 
    title, 
    summary, 
    keyPoints, 
    themes, 
    applicationPoints, 
    quotableQuotes, 
    needsReview 
  } = await summarizeViaAPI(fullTranscript, scriptures);
  
  return {
    title,
    date: new Date().toISOString(),
    duration_minutes: durationMinutes,
    transcript: fullTranscript,
    scriptures,
    summary,
    key_points: keyPoints,
    themes,
    application_points: applicationPoints,
    quotable_quotes: quotableQuotes,
    needs_review: needsReview,
  };
}

// ============================================
// Save Session (after user edits)
// ============================================
// Create client for each call to ensure fresh auth state
function getSupabase() {
  return createClient();
}

export async function saveSession(
  sessionData: SessionData, 
  organizationId?: string, 
  userId?: string
): Promise<SessionData | null> {
  console.log('[Sessions] Saving session:', sessionData.title);
  console.log('[Sessions] Org ID:', organizationId, 'User ID:', userId);
  
  try {
    // If no org/user provided, try to get from auth (fallback)
    let orgId = organizationId;
    let uId = userId;
    
    if (!orgId || !uId) {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (session?.user) {
        uId = uId || session.user.id;
        
        // Try organizations table first (user is owner)
        const { data: ownedOrg } = await getSupabase()
          .from('organizations')
          .select('id')
          .eq('owner_id', session.user.id)
          .single();
        
        if (ownedOrg?.id) {
          orgId = orgId || ownedOrg.id;
        } else {
          // Fallback to organization_members
          const { data: membership } = await getSupabase()
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', session.user.id)
            .maybeSingle();
          orgId = orgId || membership?.organization_id;
        }
      }
    }
    
    if (!orgId) {
      console.error('[Sessions] No organization ID available');
      return sessionData; // Return data so user can still download
    }
    
    console.log('[Sessions] Saving for organization:', orgId);
    
    const { data, error } = await getSupabase()
      .from('sessions')
      .insert({
        title: sessionData.title,
        date: sessionData.date,
        duration_minutes: sessionData.duration_minutes,
        transcript: sessionData.transcript,
        scriptures: JSON.stringify(sessionData.scriptures),
        summary: sessionData.summary,
        key_points: JSON.stringify(sessionData.key_points),
        organization_id: orgId,
        user_id: uId,
      })
      .select()
      .single();
    
    if (error) {
      console.error('[Sessions] Supabase save error:', error);
      // Return the data anyway so user can download
      return sessionData;
    }
    
    console.log('[Sessions] Saved successfully! ID:', data.id);
    return { ...sessionData, id: data.id };
  } catch (err) {
    console.error('[Sessions] Save exception:', err);
    // Return the data anyway so user can download
    return sessionData;
  }
}

// ============================================
// Legacy Save (for backward compatibility)
// ============================================
export async function saveSessionLegacy(
  transcript: TranscriptSegment[],
  detections: DetectionResult[],
  startTime: Date
): Promise<SessionData | null> {
  const preview = await generateSessionPreview(transcript, detections, startTime);
  return saveSession(preview);
}

// ============================================
// Get All Sessions
// ============================================
export async function getSessions(): Promise<SessionData[]> {
  const { data, error } = await getSupabase()
    .from('sessions')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('[Sessions] Fetch error:', error);
    return [];
  }
  
  return data.map((d: any) => ({
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

// ============================================
// Get Single Session
// ============================================
export async function getSession(id: string): Promise<SessionData | null> {
  const { data, error } = await getSupabase()
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

// ============================================
// Delete Session
// ============================================
export async function deleteSession(id: string): Promise<boolean> {
  const { error } = await getSupabase()
    .from('sessions')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('[Sessions] Delete error:', error);
    return false;
  }
  
  return true;
}
