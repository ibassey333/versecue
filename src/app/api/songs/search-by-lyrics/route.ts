import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lyrics = searchParams.get('lyrics') || '';
  const organizationId = searchParams.get('organizationId');
  
  if (!lyrics || lyrics.length < 5) {
    return NextResponse.json({ songs: [] });
  }
  
  const startTime = Date.now();
  
  try {
    const supabase = createClient();
    const allSongs: any[] = [];
    const seenIds = new Set<string>();
    
    const addSong = (song: any) => {
      if (!seenIds.has(song.id)) {
        seenIds.add(song.id);
        allSongs.push(song);
      }
    };
    
    // Clean the search text
    const cleanLyrics = lyrics.toLowerCase().trim();
    
    // STRATEGY 1: Search by title (in case they typed the song name)
    {
      let query = supabase
        .from('songs')
        .select('id, title, artist, lyrics, source, created_at, updated_at')
        .ilike('title', `%${cleanLyrics.substring(0, 50)}%`);
      
      if (organizationId) query = query.eq('organization_id', organizationId);
      
      const { data } = await query.limit(5);
      data?.forEach(addSong);
      console.log(`[LocalSearch] Title match: ${data?.length || 0}`);
    }
    
    // STRATEGY 2: First phrase (before comma/period)
    const firstPhrase = cleanLyrics.split(/[,\.!?]/)[0].trim();
    if (firstPhrase.length >= 10) {
      let query = supabase
        .from('songs')
        .select('id, title, artist, lyrics, source, created_at, updated_at')
        .ilike('lyrics', `%${firstPhrase}%`);
      
      if (organizationId) query = query.eq('organization_id', organizationId);
      
      const { data } = await query.limit(5);
      data?.forEach(addSong);
      console.log(`[LocalSearch] First phrase "${firstPhrase.substring(0, 30)}...": ${data?.length || 0}`);
    }
    
    // STRATEGY 3: First 5 words (handles variations)
    const words = cleanLyrics.split(/\s+/).filter(w => w.length > 2);
    if (words.length >= 3) {
      const fiveWords = words.slice(0, 5).join(' ');
      
      let query = supabase
        .from('songs')
        .select('id, title, artist, lyrics, source, created_at, updated_at')
        .ilike('lyrics', `%${fiveWords}%`);
      
      if (organizationId) query = query.eq('organization_id', organizationId);
      
      const { data } = await query.limit(5);
      data?.forEach(addSong);
      console.log(`[LocalSearch] Five words "${fiveWords}": ${data?.length || 0}`);
    }
    
    // STRATEGY 4: Key distinctive words (skip common words)
    if (allSongs.length < 3 && words.length >= 2) {
      const stopWords = new Set(['the', 'and', 'you', 'your', 'his', 'her', 'our', 'for', 'with', 'that', 'this', 'are', 'was', 'will', 'all']);
      const distinctiveWords = words
        .filter(w => w.length > 3 && !stopWords.has(w))
        .slice(0, 3);
      
      if (distinctiveWords.length >= 2) {
        // Search for songs containing ALL distinctive words
        let query = supabase
          .from('songs')
          .select('id, title, artist, lyrics, source, created_at, updated_at');
        
        // Build AND condition
        for (const word of distinctiveWords) {
          query = query.ilike('lyrics', `%${word}%`);
        }
        
        if (organizationId) query = query.eq('organization_id', organizationId);
        
        const { data } = await query.limit(5);
        data?.forEach(addSong);
        console.log(`[LocalSearch] Distinctive words [${distinctiveWords.join(', ')}]: ${data?.length || 0}`);
      }
    }
    
    console.log(`[LocalSearch] Total unique: ${allSongs.length} in ${Date.now() - startTime}ms`);
    
    return NextResponse.json({ songs: allSongs.slice(0, 10) });
    
  } catch (error: any) {
    console.error('[LocalSearch] Error:', error);
    return NextResponse.json({ songs: [] });
  }
}
