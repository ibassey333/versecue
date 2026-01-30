import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const searchParams = request.nextUrl.searchParams;
    const title = searchParams.get('title') || '';
    const lyrics = searchParams.get('lyrics') || '';
    
    if (title.length < 2 && lyrics.length < 10) {
      return NextResponse.json({ songs: [] });
    }

    // Build search query - search by title OR lyrics content
    let query = supabase
      .from('songs')
      .select('id, title, artist, lyrics, source, created_at, updated_at');
    
    // Create OR conditions for flexible matching
    const conditions: string[] = [];
    
    if (title.length >= 2) {
      // Search title (fuzzy)
      conditions.push(`title.ilike.%${title}%`);
    }
    
    if (lyrics.length >= 10) {
      // Extract key phrases from transcribed lyrics (first 50 chars)
      const lyricsSnippet = lyrics.substring(0, 80).replace(/[^a-zA-Z0-9\s]/g, '');
      const words = lyricsSnippet.split(/\s+/).filter(w => w.length > 3).slice(0, 5);
      
      // Search for songs containing these words in lyrics
      for (const word of words) {
        conditions.push(`lyrics.ilike.%${word}%`);
      }
      
      // Also search title using lyrics (e.g., "The Lord bless you" matches title)
      const firstPhrase = lyrics.split(',')[0].trim().substring(0, 30);
      if (firstPhrase.length > 5) {
        conditions.push(`title.ilike.%${firstPhrase}%`);
      }
    }
    
    if (conditions.length > 0) {
      query = query.or(conditions.join(','));
    }
    
    const { data: songs, error } = await query.limit(15);
    
    if (error) {
      console.error('Search error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Score and sort results by relevance
    const scoredSongs = (songs || []).map(song => {
      let score = 0;
      const songTitle = song.title?.toLowerCase() || '';
      const songLyrics = song.lyrics?.toLowerCase() || '';
      const searchTitle = title.toLowerCase();
      const searchLyrics = lyrics.toLowerCase();
      
      // Exact title match = highest score
      if (songTitle === searchTitle) score += 100;
      // Title contains search = high score
      else if (songTitle.includes(searchTitle)) score += 50;
      // Search contains title = medium score
      else if (searchTitle.includes(songTitle)) score += 30;
      
      // Lyrics contain transcribed text = high score
      if (searchLyrics && songLyrics.includes(searchLyrics.substring(0, 30))) score += 40;
      
      // Title matches first phrase of lyrics
      const firstPhrase = searchLyrics.split(',')[0]?.trim().toLowerCase() || '';
      if (firstPhrase && songTitle.includes(firstPhrase.substring(0, 20))) score += 60;
      
      return { ...song, _score: score };
    });
    
    // Sort by score descending
    scoredSongs.sort((a, b) => b._score - a._score);

    return NextResponse.json({ 
      songs: scoredSongs.map(({ _score, ...song }) => song)
    });
    
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
