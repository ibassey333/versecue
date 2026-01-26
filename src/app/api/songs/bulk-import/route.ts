import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 300; // 5 minutes for large imports

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { songs, organizationId } = await request.json();
    
    if (!songs || !Array.isArray(songs)) {
      return NextResponse.json({ error: 'No songs array provided' }, { status: 400 });
    }
    
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }
    
    console.log(`[BulkImport] Starting import of ${songs.length} songs`);
    
    const results = {
      total: songs.length,
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };
    
    // Process in batches of 100 for better performance
    const BATCH_SIZE = 100;
    
    for (let i = 0; i < songs.length; i += BATCH_SIZE) {
      const batch = songs.slice(i, i + BATCH_SIZE);
      
      // Prepare batch insert data
      const insertData = batch
        .filter((song: any) => song.title && song.lyrics)
        .map((song: any) => ({
          title: song.title,
          artist: song.artist || 'Unknown',
          lyrics: song.lyrics,
          source: 'import',
          source_id: song.ccliNumber || null,
          organization_id: organizationId,
        }));
      
      if (insertData.length === 0) continue;
      
      // Use upsert to handle duplicates gracefully
      const { data, error } = await supabase
        .from('songs')
        .upsert(insertData, {
          onConflict: 'organization_id,title,artist',
          ignoreDuplicates: true,
        })
        .select('id');
      
      if (error) {
        console.error(`[BulkImport] Batch error:`, error);
        results.errors.push(`Batch ${Math.floor(i/BATCH_SIZE) + 1}: ${error.message}`);
      } else {
        results.imported += data?.length || 0;
        results.skipped += batch.length - (data?.length || 0);
      }
      
      // Log progress every 1000 songs
      if ((i + BATCH_SIZE) % 1000 === 0 || i + BATCH_SIZE >= songs.length) {
        console.log(`[BulkImport] Progress: ${Math.min(i + BATCH_SIZE, songs.length)}/${songs.length}`);
      }
    }
    
    console.log(`[BulkImport] Complete: ${results.imported} imported, ${results.skipped} skipped`);
    
    return NextResponse.json(results);
    
  } catch (error: any) {
    console.error('[BulkImport] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
