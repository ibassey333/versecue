import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const title = searchParams.get('title') || '';
  const artist = searchParams.get('artist') || '';
  
  if (!title) {
    return NextResponse.json({ lyrics: '' });
  }
  
  try {
    console.log(`[LyricsFetch] Fetching: ${title} - ${artist}`);
    
    // Try LRCLib
    const query = `${title} ${artist}`.trim();
    const response = await fetch(
      `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.length > 0 && data[0].plainLyrics) {
        console.log(`[LyricsFetch] Found lyrics (${data[0].plainLyrics.length} chars)`);
        return NextResponse.json({ 
          lyrics: data[0].plainLyrics,
          source: 'lrclib',
        });
      }
    }
    
    console.log('[LyricsFetch] No lyrics found');
    return NextResponse.json({ lyrics: '', source: null });
    
  } catch (error: any) {
    console.error('[LyricsFetch] Error:', error);
    return NextResponse.json({ lyrics: '', error: error.message });
  }
}
