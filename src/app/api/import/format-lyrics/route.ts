import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import type { SongSection } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

interface FormatLyricsRequest {
  lyrics: string;
  title?: string;
  artist?: string;
}

interface FormatLyricsResponse {
  sections: SongSection[];
  suggestedTitle?: string;
  suggestedArtist?: string;
  rawFormatted?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SECTION_FORMAT_PROMPT = `You are a professional lyrics formatter for worship songs. Given raw transcribed lyrics, format them into clear sections.

RULES:
1. Identify repeated sections as [Chorus] - these are typically the most repeated parts
2. Label unique verses as [Verse 1], [Verse 2], etc. in order of appearance
3. Identify [Bridge] sections - usually shorter, transitional parts
4. Identify [Pre-Chorus] if there's a consistent buildup before each chorus
5. Identify [Outro] or [Tag] for ending sections
6. Keep original line breaks within sections
7. If language switches mid-song (e.g., English to Yoruba), note it: [Chorus - Yoruba]
8. Preserve the original words exactly - do NOT translate or modify lyrics
9. If you recognize the song, you may suggest the title and artist

OUTPUT FORMAT:
Return a JSON object with this structure:
{
  "sections": [
    {
      "type": "verse|chorus|bridge|pre-chorus|outro|intro|tag|other",
      "label": "Verse 1",
      "lyrics": "line 1\\nline 2\\nline 3",
      "order": 1
    }
  ],
  "suggestedTitle": "Song Title or null",
  "suggestedArtist": "Artist Name or null"
}

IMPORTANT: 
- The "lyrics" field should contain the actual lyrics with \\n for line breaks
- Type must be one of: verse, chorus, bridge, pre-chorus, outro, intro, tag, other
- Order should be sequential (1, 2, 3, ...)
- Only suggest title/artist if you're confident you recognize the song`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parseFormattedLyrics(content: string): SongSection[] {
  // Try to extract JSON from the response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    // Fallback: parse section markers from text
    return parseTextFormat(content);
  }
  
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (Array.isArray(parsed.sections)) {
      return parsed.sections.map((section: { type?: string; label?: string; lyrics?: string; order?: number }, index: number) => ({
        type: validateSectionType(section.type),
        label: section.label || `Section ${index + 1}`,
        lyrics: section.lyrics || '',
        order: section.order || index + 1,
      }));
    }
  } catch (e) {
    console.warn('JSON parse failed, falling back to text parsing');
  }
  
  return parseTextFormat(content);
}

function parseTextFormat(text: string): SongSection[] {
  const sections: SongSection[] = [];
  const sectionPattern = /\[([^\]]+)\]\s*([\s\S]*?)(?=\[[^\]]+\]|$)/g;
  
  let match;
  let order = 1;
  
  while ((match = sectionPattern.exec(text)) !== null) {
    const label = match[1].trim();
    const lyrics = match[2].trim();
    
    if (lyrics) {
      sections.push({
        type: inferSectionType(label),
        label,
        lyrics,
        order: order++,
      });
    }
  }
  
  // If no sections found, treat entire text as one verse
  if (sections.length === 0 && text.trim()) {
    sections.push({
      type: 'verse',
      label: 'Verse 1',
      lyrics: text.trim(),
      order: 1,
    });
  }
  
  return sections;
}

function inferSectionType(label: string): SongSection['type'] {
  const lower = label.toLowerCase();
  
  if (lower.includes('chorus') || lower.includes('hook')) return 'chorus';
  if (lower.includes('verse')) return 'verse';
  if (lower.includes('bridge')) return 'bridge';
  if (lower.includes('pre-chorus') || lower.includes('prechorus')) return 'pre-chorus';
  if (lower.includes('outro') || lower.includes('ending')) return 'outro';
  if (lower.includes('intro')) return 'intro';
  if (lower.includes('tag') || lower.includes('coda')) return 'tag';
  
  return 'other';
}

function validateSectionType(type?: string): SongSection['type'] {
  const validTypes = ['verse', 'chorus', 'bridge', 'pre-chorus', 'outro', 'intro', 'tag', 'other'];
  if (type && validTypes.includes(type)) {
    return type as SongSection['type'];
  }
  return 'other';
}

function extractSuggestions(content: string): { title?: string; artist?: string } {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        title: parsed.suggestedTitle || undefined,
        artist: parsed.suggestedArtist || undefined,
      };
    }
  } catch {
    // Ignore parse errors
  }
  return {};
}

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Check for API key
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Configuration error', message: 'Formatting service not configured' },
        { status: 500 }
      );
    }
    
    // Parse request body
    const body: FormatLyricsRequest = await request.json();
    const { lyrics, title, artist } = body;
    
    if (!lyrics || !lyrics.trim()) {
      return NextResponse.json(
        { error: 'No lyrics', message: 'Please provide lyrics to format' },
        { status: 400 }
      );
    }
    
    // Initialize Groq client
    const groq = new Groq({ apiKey });
    
    // Build context for the prompt
    let context = '';
    if (title) context += `Song Title: ${title}\n`;
    if (artist) context += `Artist: ${artist}\n`;
    
    // Call LLM for formatting
    console.log('Starting lyrics formatting...');
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: SECTION_FORMAT_PROMPT,
        },
        {
          role: 'user',
          content: `${context ? context + '\n' : ''}Lyrics to format:\n\n${lyrics}`,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent formatting
      max_tokens: 4000,
    });
    
    const content = response.choices[0]?.message?.content || '';
    console.log('Formatting complete');
    
    // Parse the formatted response
    const sections = parseFormattedLyrics(content);
    const suggestions = extractSuggestions(content);
    
    // Build response
    const result: FormatLyricsResponse = {
      sections,
      suggestedTitle: title || suggestions.title,
      suggestedArtist: artist || suggestions.artist,
    };
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Formatting error:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('rate_limit')) {
        return NextResponse.json(
          {
            error: 'Rate limited',
            message: 'Too many requests. Please try again in a moment.',
          },
          { status: 429 }
        );
      }
    }
    
    return NextResponse.json(
      {
        error: 'Formatting failed',
        message: error instanceof Error ? error.message : 'Failed to format lyrics',
      },
      { status: 500 }
    );
  }
}
