import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY!;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Tier limits
const TIER_SESSION_LIMITS: Record<string, number> = {
  free: 3,
  pro: Infinity,
  church: Infinity,
};

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    
    // 1. Verify authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // 2. Get request body
    const { orgSlug, transcript, scriptures, duration } = await req.json();
    
    if (!orgSlug || !transcript) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // 3. Verify org membership and get plan
    const { data: org } = await supabase
      .from('organizations')
      .select('id, plan')
      .eq('slug', orgSlug)
      .single();
    
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', org.id)
      .eq('user_id', user.id)
      .single();
    
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 });
    }
    
    // 4. Check session limit (free tier)
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
    const { data: usage } = await supabase
      .from('usage_monthly')
      .select('sessions_saved')
      .eq('organization_id', org.id)
      .eq('month', currentMonth)
      .single();
    
    const currentSessions = usage?.sessions_saved || 0;
    const sessionLimit = TIER_SESSION_LIMITS[org.plan];
    
    if (currentSessions >= sessionLimit) {
      return NextResponse.json({ 
        error: 'Monthly session limit reached. Upgrade to Pro for unlimited.',
        limit: sessionLimit,
        used: currentSessions,
        upgrade: true
      }, { status: 429 });
    }
    
    // 5. Generate AI summary (Pro+ only)
    let summary = 'AI summaries require Pro plan';
    let keyPoints: string[] = [];
    
    if (org.plan !== 'free') {
      const scriptureList = scriptures.map((s: any) => s.reference).join(', ');
      
      const prompt = `You are a church note-taker. Based on this sermon transcript, create professional sermon notes.

TRANSCRIPT:
${transcript.substring(0, 4000)}

SCRIPTURES REFERENCED: ${scriptureList || 'None detected'}

Respond in this exact JSON format only (no markdown):
{
  "summary": "A 2-3 paragraph summary of the sermon message",
  "keyPoints": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"]
}`;

      try {
        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1000,
            temperature: 0.3,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          let content = data.choices?.[0]?.message?.content || '';
          content = content.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(content);
          summary = parsed.summary || summary;
          keyPoints = parsed.keyPoints || [];
        }
      } catch (e) {
        console.error('[API/session/save] Summary generation failed:', e);
      }
    }
    
    // 6. Save session
    const { data: session, error: saveError } = await supabase
      .from('sessions')
      .insert({
        organization_id: org.id,
        title: `Sermon - ${new Date().toLocaleDateString('en-US', { 
          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' 
        })}`,
        transcript,
        scriptures: JSON.stringify(scriptures),
        summary,
        key_points: JSON.stringify(keyPoints),
        duration_minutes: duration,
        created_by: user.id,
      })
      .select()
      .single();
    
    if (saveError) {
      console.error('[API/session/save] Save error:', saveError);
      return NextResponse.json({ error: 'Failed to save session' }, { status: 500 });
    }
    
    // 7. Increment usage
    await supabase.rpc('increment_usage', {
      org_id: org.id,
      counter_name: 'sessions_saved',
      increment_by: 1,
    });
    
    if (duration) {
      await supabase.rpc('increment_usage', {
        org_id: org.id,
        counter_name: 'minutes_transcribed',
        increment_by: duration,
      });
    }
    
    return NextResponse.json({ 
      session: {
        id: session.id,
        title: session.title,
        summary,
        keyPoints,
        scriptures,
      }
    });
    
  } catch (error) {
    console.error('[API/session/save] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
