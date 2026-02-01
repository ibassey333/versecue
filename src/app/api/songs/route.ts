import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();
    
    const { title, artist, album, lyrics, source, sourceId, organizationId } = body;
    
    if (!title || !lyrics || !organizationId) {
      return NextResponse.json(
        { error: 'Missing required fields: title, lyrics, organizationId' },
        { status: 400 }
      );
    }
    
    // Check if song already exists (by source + sourceId or title + artist)
    const { data: existing } = await supabase
      .from('songs')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('source', source || 'local')
      .eq('source_id', sourceId || '')
      .single();
    
    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('songs')
        .update({
          title,
          artist: artist || 'Unknown',
          album,
          lyrics,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) throw error;
      return NextResponse.json({ song: data, updated: true });
    }
    
    // Insert new
    const { data, error } = await supabase
      .from('songs')
      .insert({
        title,
        artist: artist || 'Unknown',
        album,
        lyrics,
        source: source || 'local',
        source_id: sourceId,
        organization_id: organizationId,
      })
      .select()
      .single();
    
    if (error) throw error;
    return NextResponse.json({ song: data, created: true });
    
  } catch (error: any) {
    console.error('Song save error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save song' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('organizationId');
    const query = searchParams.get('q');
    
    if (!orgId) {
      return NextResponse.json(
        { error: 'Missing organizationId' },
        { status: 400 }
      );
    }
    
    let dbQuery = supabase
      .from('songs')
      .select('*')
      .eq('organization_id', orgId)
      .order('updated_at', { ascending: false });
    
    if (query) {
      // Normalize query for fuzzy matching
      const q = query.trim();
      const qNoSpaces = q.replace(/\s+/g, '');  // "Way Maker" -> "WayMaker"
      const qNoPunct = q.replace(/[^a-zA-Z0-9\s]/g, ''); // "10,000" -> "10000"
      
      // Build OR conditions for fuzzy matching
      const conditions = [
        `title.ilike.%${q}%`,
        `artist.ilike.%${q}%`,
      ];
      
      // Add no-spaces variant if different
      if (qNoSpaces !== q) {
        conditions.push(`title.ilike.%${qNoSpaces}%`);
      }
      
      // Add no-punctuation variant if different
      if (qNoPunct !== q) {
        conditions.push(`title.ilike.%${qNoPunct}%`);
      }
      
      dbQuery = dbQuery.or(conditions.join(','));
    }
    
    const { data, error } = await dbQuery.limit(50);
    
    if (error) throw error;
    return NextResponse.json({ songs: data });
    
  } catch (error: any) {
    console.error('Song fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch songs' },
      { status: 500 }
    );
  }
}
