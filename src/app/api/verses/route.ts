export const dynamic = 'force-dynamic';

// ============================================
// Verses API Route
// GET /api/verses?reference=John+3:16&translation=KJV
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { fetchVerse } from '@/lib/bible';
import { parseScriptures } from '@/lib/detection/parser';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');
    const translation = searchParams.get('translation') || 'KJV';
    
    if (!reference) {
      return NextResponse.json(
        { success: false, error: 'Missing reference parameter' },
        { status: 400 }
      );
    }
    
    // Parse the reference
    const parsed = parseScriptures(reference);
    
    if (parsed.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Could not parse reference' },
        { status: 400 }
      );
    }
    
    // Fetch the verse
    const verse = await fetchVerse(parsed[0].reference, translation);
    
    if (!verse) {
      return NextResponse.json(
        { success: false, error: 'Verse not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: verse,
    });
  } catch (error) {
    console.error('Verses API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch verse' },
      { status: 500 }
    );
  }
}
