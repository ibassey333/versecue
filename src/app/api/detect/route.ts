import { NextRequest, NextResponse } from 'next/server';
import { detectScriptures } from '@/lib/detection';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
    
    const detections = await detectScriptures(text);
    
    return NextResponse.json({ detections });
  } catch (error) {
    console.error('Detection error:', error);
    return NextResponse.json({ error: 'Detection failed' }, { status: 500 });
  }
}
