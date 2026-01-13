import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// NOTE: You need DEEPGRAM_API_KEY and DEEPGRAM_PROJECT_ID in environment
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY!;
const DEEPGRAM_PROJECT_ID = process.env.DEEPGRAM_PROJECT_ID!;

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    
    // 1. Verify authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // 2. Get org slug from request
    const { orgSlug } = await req.json();
    
    if (!orgSlug) {
      return NextResponse.json({ error: 'Missing orgSlug' }, { status: 400 });
    }
    
    // 3. Verify org membership and check plan
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
    
    // 4. Check tier - Enhanced speech requires Pro+
    if (org.plan === 'free') {
      return NextResponse.json({ 
        error: 'Enhanced Speech requires Pro plan',
        upgrade: true 
      }, { status: 403 });
    }
    
    // 5. Generate temporary token from Deepgram
    // Note: Verify this endpoint against current Deepgram docs
    const response = await fetch(
      `https://api.deepgram.com/v1/projects/${DEEPGRAM_PROJECT_ID}/keys`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment: `VerseCue temp token for ${orgSlug}`,
          scopes: ['usage:write'],
          time_to_live_in_seconds: 600, // 10 minutes
        }),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API/speech/token] Deepgram error:', errorText);
      return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
    }
    
    const data = await response.json();
    
    return NextResponse.json({ 
      token: data.key,
      expiresIn: 600,
    });
    
  } catch (error) {
    console.error('[API/speech/token] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
