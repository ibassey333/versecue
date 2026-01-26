import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { songs, organizationId } = await request.json();
    
    if (!songs || !Array.isArray(songs) || songs.length === 0) {
      return NextResponse.json({ error: 'No songs provided' }, { status: 400 });
    }
    
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }
    
    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };
    
    for (const song of songs) {
      try {
        // Check for duplicate (same title + artist)
        const { data: existing } = await supabase
          .from('songs')
          .select('id')
          .eq('organization_id', organizationId)
          .ilike('title', song.title)
          .ilike('artist', song.artist || 'Unknown')
          .single();
        
        if (existing) {
          results.skipped++;
          continue;
        }
        
        // Insert new song
        const { error } = await supabase
          .from('songs')
          .insert({
            title: song.title,
            artist: song.artist || 'Unknown',
            lyrics: song.lyrics,
            source: 'import',
            source_id: song.ccliNumber || null,
            organization_id: organizationId,
          });
        
        if (error) {
          results.errors.push(`${song.title}: ${error.message}`);
        } else {
          results.imported++;
        }
      } catch (err: any) {
        results.errors.push(`${song.title}: ${err.message}`);
      }
    }
    
    return NextResponse.json(results);
    
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
