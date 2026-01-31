import { NextRequest, NextResponse } from 'next/server';

const GENIUS_TOKEN = process.env.GENIUS_ACCESS_TOKEN;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const type = searchParams.get('type') || 'song'; // 'song' or 'lyric'
  
  if (!query || query.length < 5) {
    return NextResponse.json({ hits: [] });
  }
  
  if (!GENIUS_TOKEN) {
    console.error('[Genius] No access token configured');
    return NextResponse.json({ error: 'Genius API not configured' }, { status: 500 });
  }
  
  try {
    console.log(`[Genius] Searching (${type}):`, query.substring(0, 50) + '...');
    
    const url = `https://api.genius.com/search?q=${encodeURIComponent(query)}&per_page=10`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${GENIUS_TOKEN}`,
      },
    });
    
    if (!response.ok) {
      console.error('[Genius] API error:', response.status);
      return NextResponse.json({ error: 'Genius API error' }, { status: response.status });
    }
    
    const data = await response.json();
    
    // Extract relevant song info
    const hits = (data.response?.hits || []).map((hit: any) => ({
      id: hit.result?.id,
      title: hit.result?.title || hit.result?.full_title,
      artist: hit.result?.primary_artist?.name || 'Unknown',
      url: hit.result?.url,
      thumbnail: hit.result?.song_art_image_thumbnail_url,
    }));
    
    console.log(`[Genius] Found ${hits.length} results`);
    
    return NextResponse.json({ hits });
    
  } catch (error: any) {
    console.error('[Genius] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
