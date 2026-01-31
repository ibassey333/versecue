import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lyrics = searchParams.get('lyrics') || '';
  const organizationId = searchParams.get('organizationId');
  
  if (!lyrics || lyrics.length < 10) {
    return NextResponse.json({ songs: [] });
  }
  
  try {
    const supabase = createClient();
    
    // Extract first phrase (most distinctive part)
    const firstPhrase = lyrics
      .split(/[,\.!?]/)[0]
      .trim()
      .toLowerCase()
      .substring(0, 50);
    
    console.log('[LocalSearch] Phrase:', firstPhrase);
    
    // Search for songs where lyrics contain this phrase
    let query = supabase
      .from('songs')
      .select('id, title, artist, lyrics, source, created_at, updated_at')
      .ilike('lyrics', `%${firstPhrase}%`);
    
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    
    const { data: songs, error } = await query.limit(10);
    
    if (error) {
      console.error('[LocalSearch] Error:', error);
      return NextResponse.json({ songs: [] });
    }
    
    console.log(`[LocalSearch] Found ${songs?.length || 0} songs`);
    
    return NextResponse.json({ songs: songs || [] });
    
  } catch (error: any) {
    console.error('[LocalSearch] Error:', error);
    return NextResponse.json({ songs: [] });
  }
}
