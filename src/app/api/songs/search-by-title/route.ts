import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const searchParams = request.nextUrl.searchParams;
    const title = searchParams.get('title') || '';
    const lyrics = searchParams.get('lyrics') || '';
    
    console.log('[Search] Title:', title, 'Lyrics:', lyrics.substring(0, 50) + '...');
    
    if (title.length < 2 && lyrics.length < 10) {
      return NextResponse.json({ songs: [] });
    }

    const allSongs: any[] = [];
    const seenIds = new Set<string>();

    // STRATEGY 1: Exact title match from LLM
    if (title.length >= 2) {
      const { data: titleMatches } = await supabase
        .from('songs')
        .select('id, title, artist, lyrics, source, created_at, updated_at')
        .ilike('title', `%${title}%`)
        .limit(5);
      
      if (titleMatches) {
        for (const song of titleMatches) {
          if (!seenIds.has(song.id)) {
            seenIds.add(song.id);
            allSongs.push({ ...song, matchType: 'title' });
          }
        }
      }
      console.log('[Search] Title matches:', titleMatches?.length || 0);
    }

    // STRATEGY 2: First phrase of transcribed lyrics matches title
    // e.g., "the Lord bless you and keep you" → title contains this
    if (lyrics.length >= 10) {
      // Get first meaningful phrase (before first comma or period, max 40 chars)
      const firstPhrase = lyrics
        .split(/[,\.!?]/)[0]
        .trim()
        .substring(0, 40)
        .toLowerCase();
      
      if (firstPhrase.length >= 10) {
        console.log('[Search] Searching title for phrase:', firstPhrase);
        
        const { data: phraseMatches } = await supabase
          .from('songs')
          .select('id, title, artist, lyrics, source, created_at, updated_at')
          .ilike('title', `%${firstPhrase}%`)
          .limit(5);
        
        if (phraseMatches) {
          for (const song of phraseMatches) {
            if (!seenIds.has(song.id)) {
              seenIds.add(song.id);
              allSongs.push({ ...song, matchType: 'phrase-in-title' });
            }
          }
        }
        console.log('[Search] Phrase-in-title matches:', phraseMatches?.length || 0);
      }
    }

    // STRATEGY 3: Lyrics contain the transcribed phrase
    if (lyrics.length >= 20 && allSongs.length < 10) {
      // Use a longer phrase for lyrics search (more specific)
      const lyricsPhrase = lyrics
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .substring(0, 60)
        .trim()
        .toLowerCase();
      
      if (lyricsPhrase.length >= 15) {
        console.log('[Search] Searching lyrics for:', lyricsPhrase.substring(0, 30) + '...');
        
        const { data: lyricsMatches } = await supabase
          .from('songs')
          .select('id, title, artist, lyrics, source, created_at, updated_at')
          .ilike('lyrics', `%${lyricsPhrase.substring(0, 30)}%`)
          .limit(5);
        
        if (lyricsMatches) {
          for (const song of lyricsMatches) {
            if (!seenIds.has(song.id)) {
              seenIds.add(song.id);
              allSongs.push({ ...song, matchType: 'lyrics-content' });
            }
          }
        }
        console.log('[Search] Lyrics-content matches:', lyricsMatches?.length || 0);
      }
    }

    console.log('[Search] Total unique matches:', allSongs.length);

    // Sort: title matches first, then phrase matches, then lyrics matches
    const sortOrder = { 'title': 0, 'phrase-in-title': 1, 'lyrics-content': 2 };
    allSongs.sort((a, b) => (sortOrder[a.matchType as keyof typeof sortOrder] || 99) - (sortOrder[b.matchType as keyof typeof sortOrder] || 99));

    return NextResponse.json({ 
      songs: allSongs.map(({ matchType, ...song }) => song).slice(0, 10)
    });
    
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
