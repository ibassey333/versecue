import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const searchParams = request.nextUrl.searchParams;
    const title = searchParams.get('title') || '';
    
    if (title.length < 2) {
      return NextResponse.json({ songs: [] });
    }

    // Search by title only (fuzzy match)
    const { data: songs, error } = await supabase
      .from('songs')
      .select('id, title, artist, lyrics, source, created_at, updated_at')
      .ilike('title', `%${title}%`)
      .limit(10);
    
    if (error) {
      console.error('Title search error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ songs: songs || [] });
    
  } catch (error: any) {
    console.error('Title search error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
