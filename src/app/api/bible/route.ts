import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const API_BIBLE_KEY = process.env.API_BIBLE_KEY!;
const API_BIBLE_URL = 'https://api.scripture.api.bible/v1';

// Translation IDs for API.Bible
const TRANSLATION_IDS: Record<string, string> = {
  KJV: 'de4e12af7f28f599-02',
  WEB: '9879dbb7cfe39e4d-04',
  ASV: '06125adad2d5898a-01',
};

// Tier translation access
const TIER_TRANSLATIONS: Record<string, string[]> = {
  free: ['KJV'],
  pro: ['KJV', 'WEB', 'ASV'],
  church: ['KJV', 'WEB', 'ASV'],
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
    const { orgSlug, book, chapter, verseStart, verseEnd, translation = 'KJV' } = await req.json();
    
    if (!orgSlug || !book || !chapter || !verseStart) {
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
    
    // 4. Check translation access
    const allowedTranslations = TIER_TRANSLATIONS[org.plan] || ['KJV'];
    if (!allowedTranslations.includes(translation)) {
      return NextResponse.json({ 
        error: `${translation} requires Pro plan`,
        upgrade: true 
      }, { status: 403 });
    }
    
    // 5. Get Bible ID
    const bibleId = TRANSLATION_IDS[translation];
    if (!bibleId) {
      return NextResponse.json({ error: 'Translation not supported' }, { status: 400 });
    }
    
    // 6. Fetch verse from API.Bible
    const verseRef = verseEnd && verseEnd !== verseStart
      ? `${book}.${chapter}.${verseStart}-${book}.${chapter}.${verseEnd}`
      : `${book}.${chapter}.${verseStart}`;
    
    const response = await fetch(
      `${API_BIBLE_URL}/bibles/${bibleId}/passages/${verseRef}?content-type=text&include-notes=false`,
      {
        headers: {
          'api-key': API_BIBLE_KEY,
        },
      }
    );
    
    if (!response.ok) {
      // Fallback for verses not found
      return NextResponse.json({ 
        verse: '',
        error: 'Verse not found' 
      }, { status: 404 });
    }
    
    const data = await response.json();
    const verseText = data.data?.content?.trim() || '';
    
    // 7. Increment usage
    await supabase.rpc('increment_usage', {
      org_id: org.id,
      counter_name: 'api_bible_calls',
      increment_by: 1,
    });
    
    return NextResponse.json({ 
      verse: verseText,
      reference: data.data?.reference || `${book} ${chapter}:${verseStart}`,
      translation,
    });
    
  } catch (error) {
    console.error('[API/bible] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
