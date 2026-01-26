import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    console.log('[Transcribe] File received:', audioFile.name, 'Size:', audioFile.size, 'Type:', audioFile.type);

    // Try both env variable names
    const groqApiKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY;
    
    if (!groqApiKey) {
      console.error('[Transcribe] No Groq API key found');
      return NextResponse.json({ error: 'Groq API key not configured' }, { status: 500 });
    }

    // Convert to a format Groq accepts
    const arrayBuffer = await audioFile.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: 'audio/webm' });
    
    // Create form data for Groq
    const groqFormData = new FormData();
    groqFormData.append('file', blob, 'audio.webm');
    groqFormData.append('model', 'whisper-large-v3');
    groqFormData.append('language', 'en');
    groqFormData.append('response_format', 'json');

    console.log('[Transcribe] Sending to Groq...');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: groqFormData,
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('[Transcribe] Groq error:', response.status, responseText);
      return NextResponse.json({ 
        error: 'Transcription failed', 
        details: responseText 
      }, { status: 500 });
    }

    const data = JSON.parse(responseText);
    console.log('[Transcribe] Success:', data.text?.substring(0, 200));
    
    return NextResponse.json({ 
      text: data.text,
      duration: data.duration,
    });

  } catch (error: any) {
    console.error('[Transcribe] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
