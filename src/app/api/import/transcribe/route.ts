import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { readFile, writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import os from 'os';
import Groq from 'groq-sdk';

const TEMP_DIR = path.join(os.tmpdir(), 'versecue-imports');
const MAX_SIZE = 50 * 1024 * 1024;
const GROQ_LIMIT = 24 * 1024 * 1024;
const PATH_EXT = '/opt/homebrew/bin:/usr/local/bin:/usr/bin';

// Languages actually supported by Groq Whisper
const WHISPER_LANGS = new Set([
  'en', 'zh', 'de', 'es', 'ru', 'ko', 'fr', 'ja', 'pt', 'tr', 'pl', 'ca',
  'nl', 'ar', 'sv', 'it', 'id', 'hi', 'fi', 'vi', 'he', 'uk', 'el', 'ms',
  'cs', 'ro', 'da', 'hu', 'ta', 'no', 'th', 'ur', 'hr', 'bg', 'lt', 'la',
  'mi', 'ml', 'cy', 'sk', 'te', 'fa', 'lv', 'bn', 'sr', 'az', 'sl', 'kn',
  'et', 'mk', 'br', 'eu', 'is', 'hy', 'ne', 'mn', 'bs', 'kk', 'sq', 'sw',
  'gl', 'mr', 'pa', 'si', 'km', 'sn', 'yo', 'so', 'af', 'oc', 'ka', 'be',
  'tg', 'sd', 'gu', 'am', 'yi', 'lo', 'uz', 'fo', 'ht', 'ps', 'tk', 'nn',
  'mt', 'sa', 'lb', 'my', 'bo', 'tl', 'mg', 'as', 'tt', 'haw', 'ln', 'ha',
  'ba', 'jv', 'su', 'yue',
]);

// Languages NOT supported by Whisper but we support via LLM correction
// ig (Igbo), pcm (Pidgin), tw (Twi), zu (Zulu)
// For these: transcribe with auto-detect, then correct via LLM

function run(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      env: { ...process.env, PATH: `${PATH_EXT}:${process.env.PATH}` },
      shell: true,
    });
    let stdout = '', stderr = '';
    proc.stdout.on('data', (d) => (stdout += d));
    proc.stderr.on('data', (d) => (stderr += d));
    proc.on('close', (code) =>
      code === 0 ? resolve({ stdout, stderr }) : reject(new Error(stderr.slice(-300) || `Exit ${code}`))
    );
    proc.on('error', reject);
  });
}

// Format seconds to mm:ss or h:mm:ss
function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }

  let tempIn: string | null = null;
  let tempOut: string | null = null;

  try {
    const formData = await request.formData();
    const audio = formData.get('audio') as File | Blob;
    const languages: string[] = JSON.parse((formData.get('languages') as string) || '["auto"]');

    if (!audio) return NextResponse.json({ error: 'No audio' }, { status: 400 });
    if (audio.size > MAX_SIZE) return NextResponse.json({ error: 'File exceeds 50MB' }, { status: 400 });

    let fileToSend: File;

    // Compress if too large for Groq
    if (audio.size > GROQ_LIMIT) {
      console.log(`[Transcribe] Compressing ${(audio.size / 1048576).toFixed(1)}MB...`);
      if (!existsSync(TEMP_DIR)) await mkdir(TEMP_DIR, { recursive: true });
      const uid = randomUUID();
      tempIn = path.join(TEMP_DIR, `tin_${uid}`);
      tempOut = path.join(TEMP_DIR, `tout_${uid}.mp3`);

      await writeFile(tempIn, Buffer.from(await audio.arrayBuffer()));
      await run('ffmpeg', ['-i', tempIn, '-ac', '1', '-ar', '16000', '-ab', '64k', '-f', 'mp3', tempOut, '-y']);
      const compressed = await readFile(tempOut);
      console.log(`[Transcribe] Compressed to ${(compressed.length / 1048576).toFixed(1)}MB`);
      fileToSend = new File([compressed], 'audio.mp3', { type: 'audio/mpeg' });
    } else {
      const extMap: Record<string, string> = {
        'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/wav': 'wav',
        'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/flac': 'flac',
        'audio/m4a': 'm4a', 'audio/mp4': 'mp4', 'audio/x-m4a': 'm4a',
      };
      const ext = extMap[audio.type] || 'mp3';
      fileToSend = new File([audio], `audio.${ext}`, { type: audio.type || 'audio/mpeg' });
    }

    // Find a Whisper-supported language from the selection
    // For unsupported langs (Igbo, Pidgin, Twi, Zulu), fall back to auto-detect
    // The LLM correction step will handle these languages later
    const whisperLang = languages.find((l) => l !== 'auto' && WHISPER_LANGS.has(l));
    const unsupported = languages.filter((l) => l !== 'auto' && !WHISPER_LANGS.has(l));
    
    if (unsupported.length > 0) {
      console.log(`[Transcribe] Languages not in Whisper: ${unsupported.join(', ')} — using auto-detect, will correct via LLM`);
    }
    
    console.log(`[Transcribe] Sending to Groq... whisperLang=${whisperLang || 'auto'}, allLangs=${languages.join(',')}`);

    const groq = new Groq({ apiKey });
    const result = await groq.audio.transcriptions.create({
      file: fileToSend,
      model: 'whisper-large-v3',
      response_format: 'verbose_json',
      ...(whisperLang ? { language: whisperLang } : {}),
    });

    // Extract segments with timestamps for the editing UI
    // Whisper verbose_json returns segments array with start/end times
    const rawSegments = (result as unknown as { segments?: Array<{ start: number; end: number; text: string }> }).segments || [];
    
    const segments = rawSegments.map((seg) => ({
      start: seg.start,
      end: seg.end,
      startFormatted: formatTimestamp(seg.start),
      endFormatted: formatTimestamp(seg.end),
      text: seg.text.trim(),
    }));

    console.log(`[Transcribe] Done: ${result.text?.length} chars, ${segments.length} segments`);

    return NextResponse.json({
      text: result.text,
      language: "en",
      duration: 0,
      languages, // Pass all selected languages through for LLM correction
      segments,  // NEW: timestamped segments for editing UI
    });
  } catch (error) {
    console.error('[Transcribe] Error:', error);
    return NextResponse.json(
      { error: 'Failed', message: error instanceof Error ? error.message : 'Transcription failed' },
      { status: 500 }
    );
  } finally {
    for (const p of [tempIn, tempOut]) {
      if (p && existsSync(p)) await unlink(p).catch(() => {});
    }
  }
}
