import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

// ============================================================================
// TYPES
// ============================================================================

interface TranscriptionResult {
  text: string;
  language: string;
  detectedLanguages: string[];
  duration?: number;
  segments?: TranscriptionSegment[];
  suggestedTitle?: string;
  suggestedArtist?: string;
}

interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Language display names
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  yo: 'Yoruba',
  ig: 'Igbo',
  ha: 'Hausa',
  sw: 'Swahili',
  es: 'Spanish',
  pt: 'Portuguese',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  ko: 'Korean',
  zh: 'Chinese',
  ja: 'Japanese',
  hi: 'Hindi',
  ar: 'Arabic',
  ru: 'Russian',
  pl: 'Polish',
  id: 'Indonesian',
  tw: 'Twi',
  zu: 'Zulu',
  am: 'Amharic',
  pcm: 'Pidgin',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function detectMixedLanguages(text: string, primaryLanguage: string): string[] {
  const detected = new Set<string>();
  detected.add(primaryLanguage);
  
  // Common patterns for mixed-language worship songs
  // Yoruba patterns
  const yorubaPatterns = [
    /\bimela\b/i,
    /\bokaka\b/i,
    /\bonyekeruwa\b/i,
    /\beze\s+mo\b/i,
    /\boluwa\b/i,
    /\bbaba\b/i,
    /\bjesu\b/i,
    /\bhalleluyah\b/i,
    /\bolorun\b/i,
  ];
  
  // Igbo patterns
  const igboPatterns = [
    /\bnara\s+ekele\b/i,
    /\bchukwu\b/i,
    /\bnwanne\b/i,
    /\bdi\s+nma\b/i,
  ];
  
  // Check for Yoruba
  if (primaryLanguage !== 'yo' && yorubaPatterns.some(p => p.test(text))) {
    detected.add('yo');
  }
  
  // Check for Igbo
  if (primaryLanguage !== 'ig' && igboPatterns.some(p => p.test(text))) {
    detected.add('ig');
  }
  
  // Check for English (common in African worship)
  const englishPatterns = [
    /\bjesus\b/i,
    /\bworthy\b/i,
    /\bholy\b/i,
    /\bpraise\b/i,
    /\blord\b/i,
    /\bgrateful\b/i,
    /\bthank\s+you\b/i,
    /\bglory\b/i,
  ];
  
  if (primaryLanguage !== 'en' && englishPatterns.some(p => p.test(text))) {
    detected.add('en');
  }
  
  return Array.from(detected).map(code => LANGUAGE_NAMES[code] || code);
}

async function extractMetadataFromText(
  text: string,
  groq: Groq
): Promise<{ title?: string; artist?: string }> {
  try {
    // Use a quick LLM call to try to identify song info from lyrics
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a worship music expert. Given song lyrics, identify the song title and artist if you recognize it. Only respond if you're confident. Respond in JSON format: {"title": "...", "artist": "..."} or {"title": null, "artist": null} if unknown.`,
        },
        {
          role: 'user',
          content: `Identify this song from its lyrics (first 500 characters):\n\n${text.slice(0, 500)}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 100,
    });
    
    const content = response.choices[0]?.message?.content || '{}';
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        title: parsed.title || undefined,
        artist: parsed.artist || undefined,
      };
    }
  } catch (error) {
    console.warn('Metadata extraction failed:', error);
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
        { error: 'Configuration error', message: 'Transcription service not configured' },
        { status: 500 }
      );
    }
    
    // Parse multipart form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | Blob;
    const language = (formData.get('language') as string) || 'auto';
    const providedTitle = formData.get('title') as string | null;
    const providedArtist = formData.get('artist') as string | null;
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file', message: 'Please provide an audio file' },
        { status: 400 }
      );
    }
    
    // Check file size
    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: 'File too large',
          message: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
        },
        { status: 400 }
      );
    }
    
    // Initialize Groq client
    const groq = new Groq({ apiKey });
    
    // Convert Blob to File with proper extension (Groq requires valid extension)
    let fileToTranscribe: File;
    
    // Determine file extension from content type
    const contentType = audioFile.type || 'audio/mpeg';
    const extensionMap: Record<string, string> = {
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/wav': 'wav',
      'audio/x-wav': 'wav',
      'audio/webm': 'webm',
      'audio/ogg': 'ogg',
      'audio/flac': 'flac',
      'audio/m4a': 'm4a',
      'audio/mp4': 'mp4',
      'audio/x-m4a': 'm4a',
    };
    const extension = extensionMap[contentType] || 'mp3';
    const fileName = `audio.${extension}`;
    
    console.log(`Processing audio: type=${contentType}, filename=${fileName}, size=${audioFile.size}`);
    
    if (audioFile instanceof File && audioFile.name && audioFile.name.includes('.')) {
      // Use original file if it has a proper name
      fileToTranscribe = audioFile;
    } else {
      // Create a File from Blob with proper extension
      fileToTranscribe = new File([audioFile], fileName, {
        type: contentType,
      });
    }
    
    // Prepare transcription options
    const transcriptionOptions: Parameters<typeof groq.audio.transcriptions.create>[0] = {
      file: fileToTranscribe,
      model: 'whisper-large-v3',
      response_format: 'verbose_json',
    };
    
    // Add language hint if not auto-detect
    if (language !== 'auto') {
      transcriptionOptions.language = language;
    }
    
    // Perform transcription
    console.log('Starting transcription...');
    const transcription = await groq.audio.transcriptions.create(transcriptionOptions);
    
    console.log('Transcription complete:', {
      textLength: transcription.text?.length,
      language: transcription.language,
    });
    
    // Extract detected language
    const detectedLanguage = transcription.language || language || 'en';
    
    // Detect mixed languages
    const detectedLanguages = detectMixedLanguages(transcription.text, detectedLanguage);
    
    // Try to identify song metadata if not provided
    let suggestedTitle: string | undefined;
    let suggestedArtist: string | undefined;
    
    if (!providedTitle || !providedArtist) {
      const metadata = await extractMetadataFromText(transcription.text, groq);
      suggestedTitle = providedTitle || metadata.title;
      suggestedArtist = providedArtist || metadata.artist;
    }
    
    // Build response
    const result: TranscriptionResult = {
      text: transcription.text,
      language: LANGUAGE_NAMES[detectedLanguage] || detectedLanguage,
      detectedLanguages,
      duration: transcription.duration,
      suggestedTitle,
      suggestedArtist,
    };
    
    // Include segments if available (from verbose_json)
    if ('segments' in transcription && Array.isArray(transcription.segments)) {
      result.segments = transcription.segments.map((seg: { start: number; end: number; text: string }) => ({
        start: seg.start,
        end: seg.end,
        text: seg.text,
      }));
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Transcription error:', error);
    
    // Handle specific Groq errors
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
      if (error.message.includes('invalid_api_key')) {
        return NextResponse.json(
          {
            error: 'Configuration error',
            message: 'Transcription service not properly configured.',
          },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      {
        error: 'Transcription failed',
        message: error instanceof Error ? error.message : 'Failed to transcribe audio',
      },
      { status: 500 }
    );
  }
}
