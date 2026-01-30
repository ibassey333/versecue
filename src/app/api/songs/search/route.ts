import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const organizationId = searchParams.get('organizationId');
    const setlistSongIds = searchParams.get('setlistSongIds')?.split(',').filter(Boolean) || [];
    
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }
    
    if (query.length < 2) {
      return NextResponse.json({ songs: [], setlistMatches: [], libraryMatches: [] });
    }

    // Search library
    const { data: librarySongs, error } = await supabase
      .from('songs')
      .select('id, title, artist, lyrics, source')
      .eq('organization_id', organizationId)
      .or(`title.ilike.%${query}%,artist.ilike.%${query}%`)
      .limit(50);
    
    if (error) {
      console.error('Search error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Separate setlist matches from library matches
    const setlistMatches = librarySongs?.filter(s => setlistSongIds.includes(s.id)) || [];
    const libraryMatches = librarySongs?.filter(s => !setlistSongIds.includes(s.id)) || [];

    return NextResponse.json({
      songs: librarySongs || [],
      setlistMatches,
      libraryMatches,
      total: librarySongs?.length || 0,
    });
    
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
