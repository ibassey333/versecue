import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY!;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Tier limits
const TIER_LLM_LIMITS: Record<string, number> = {
  free: 0,
  pro: 500,
  church: 2000,
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
    const { orgSlug, text, mode } = await req.json();
    
    if (!orgSlug || !text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // 3. Verify org membership
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
    
    // 4. If requesting "intelligent" detection, check tier
    if (mode === 'intelligent') {
      if (org.plan === 'free') {
        return NextResponse.json({ 
          error: 'Intelligent Detection requires Pro plan',
          upgrade: true 
        }, { status: 403 });
      }
      
      // Check monthly limit
      const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
      const { data: usage } = await supabase
        .from('usage_monthly')
        .select('llm_calls')
        .eq('organization_id', org.id)
        .eq('month', currentMonth)
        .single();
      
      const currentUsage = usage?.llm_calls || 0;
      if (currentUsage >= TIER_LLM_LIMITS[org.plan]) {
        return NextResponse.json({ 
          error: 'Monthly Intelligent Detection limit reached',
          limit: TIER_LLM_LIMITS[org.plan],
          used: currentUsage
        }, { status: 429 });
      }
    }
    
    // 5. Call Groq for AI detection (only if intelligent mode)
    if (mode === 'intelligent') {
      const systemPrompt = `You are a Bible reference detector. Given a text snippet, identify any implicit scripture references.
      
Examples of implicit references:
- "prodigal son" → Luke 15:11-32
- "David and Goliath" → 1 Samuel 17
- "good Samaritan" → Luke 10:25-37
- "the Lord is my shepherd" → Psalm 23:1

Respond ONLY with JSON: {"references": [{"book": "Luke", "chapter": 15, "verseStart": 11, "verseEnd": 32, "confidence": 0.95}]}
If no references found, respond: {"references": []}`;

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text },
          ],
          max_tokens: 500,
          temperature: 0.1,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Groq API error');
      }
      
      const data = await response.json();
      let content = data.choices?.[0]?.message?.content || '{"references": []}';
      content = content.replace(/```json|```/g, '').trim();
      
      // Increment usage
      await supabase.rpc('increment_usage', {
        org_id: org.id,
        counter_name: 'llm_calls',
        increment_by: 1,
      });
      
      try {
        const parsed = JSON.parse(content);
        return NextResponse.json({ 
          results: parsed.references || [],
          source: 'intelligent'
        });
      } catch {
        return NextResponse.json({ results: [], source: 'intelligent' });
      }
    }
    
    // Direct mode - just return empty (client handles deterministic parsing)
    return NextResponse.json({ results: [], source: 'direct' });
    
  } catch (error) {
    console.error('[API/detect] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
