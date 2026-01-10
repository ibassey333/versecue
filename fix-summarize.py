#!/usr/bin/env python3
"""
Fix summarize API route
"""
import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path) if os.path.dirname(path) else '.', exist_ok=True)
    with open(path, 'w') as f:
        f.write(content)
    print(f"✅ Created: {path}")

SUMMARIZE_ROUTE = r'''import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcript, scriptures } = body;
    
    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid transcript' },
        { status: 400 }
      );
    }
    
    const scriptureList = (scriptures || [])
      .map((s: { reference: string }) => `- ${s.reference}`)
      .join('\n');
    
    const prompt = `Analyze this sermon transcript and provide a brief summary.

SCRIPTURES REFERENCED:
${scriptureList || 'None detected'}

TRANSCRIPT:
${transcript.substring(0, 6000)}${transcript.length > 6000 ? '...[truncated]' : ''}

Provide a JSON response with:
1. "summary": A 2-3 paragraph summary of the sermon's main message
2. "themes": An array of 3-5 key themes/topics discussed

Return ONLY valid JSON, no markdown:
{"summary": "...", "themes": ["theme1", "theme2"]}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-70b-versatile',
      messages: [
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 1024,
    });
    
    const responseText = completion.choices[0]?.message?.content || '{}';
    
    try {
      const response = JSON.parse(responseText);
      return NextResponse.json({
        success: true,
        data: {
          summary: response.summary || '',
          themes: response.themes || [],
        },
      });
    } catch {
      return NextResponse.json(
        { success: false, error: 'Failed to parse summary' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Summarize API error:', error);
    return NextResponse.json(
      { success: false, error: 'Summarization failed' },
      { status: 500 }
    );
  }
}
'''

def main():
    print("=" * 60)
    print("Fixing Summarize Route")
    print("=" * 60)
    
    write_file("src/app/api/summarize/route.ts", SUMMARIZE_ROUTE)
    
    print("\n" + "=" * 60)
    print("Done! Run: npx tsc --noEmit && npm run dev")
    print("=" * 60)

if __name__ == "__main__":
    main()
