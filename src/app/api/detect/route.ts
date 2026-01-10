// ============================================
// Detection API Route
// POST /api/detect
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { detectScriptures } from '@/lib/detection';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, context, fetchVerses = true } = body;
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid text parameter' },
        { status: 400 }
      );
    }
    
    const detections = await detectScriptures(text, {
      context,
      fetchVerses,
    });
    
    return NextResponse.json({
      success: true,
      data: {
        detections,
        count: detections.length,
      },
    });
  } catch (error) {
    console.error('Detection API error:', error);
    return NextResponse.json(
      { success: false, error: 'Detection failed' },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    success: true,
    service: 'VerseCue Detection API',
    status: 'operational',
  });
}
