import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import os from 'os';

const TEMP_DIR = path.join(os.tmpdir(), 'versecue-imports');
const MAX_DURATION = 30 * 60;
const MAX_SERVICE = 4 * 60 * 60;
const PATH_EXT = '/opt/homebrew/bin:/usr/local/bin:/usr/bin';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function videoId(url: string): string | null {
  const patterns = [/youtube\.com\/watch\?v=([\w-]+)/, /youtu\.be\/([\w-]+)/, /youtube\.com\/embed\/([\w-]+)/];
  for (const p of patterns) { const m = url.match(p); if (m) return m[1]; }
  return null;
}

function run(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { env: { ...process.env, PATH: `${PATH_EXT}:${process.env.PATH}` }, shell: true });
    let stdout = '', stderr = '';
    proc.stdout.on('data', (d) => (stdout += d));
    proc.stderr.on('data', (d) => (stderr += d));
    proc.on('close', (code) => code === 0 ? resolve({ stdout, stderr }) : reject(new Error(stderr.slice(-500) || `Exit ${code}`)));
    proc.on('error', reject);
  });
}

async function ensureDir() { if (!existsSync(TEMP_DIR)) await mkdir(TEMP_DIR, { recursive: true }); }
async function cleanup(...paths: (string | null)[]) { for (const p of paths) if (p && existsSync(p)) await unlink(p).catch(() => {}); }

// ============================================
// Production: Feature not available message
// ============================================
function handleProductionRequest(): NextResponse {
  return NextResponse.json({ 
    error: 'Not available', 
    message: 'YouTube import is currently available only in the VerseCue desktop app. Please run VerseCue locally to use this feature.',
    productionLimited: true
  }, { status: 503 });
}

function handleProductionGet(url: string): NextResponse {
  // Allow fetching video info in production (just metadata, no download)
  const id = videoId(url);
  if (!id) return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  
  // Return basic info using YouTube's public thumbnail API
  return NextResponse.json({ 
    title: 'YouTube Video',
    duration: 0,
    channel: 'Unknown',
    thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
    productionLimited: true,
    message: 'Full YouTube import available in desktop app only'
  });
}

// ============================================
// Local: yt-dlp (fully functional)
// ============================================
async function handleLocalRequest(body: any): Promise<NextResponse> {
  let rawFile: string | null = null, outFile: string | null = null;
  try {
    const { url, startTime, endTime, downloadOnly, tempId } = body;

    if (tempId) {
      const serviceFile = path.join(TEMP_DIR, `service_${tempId}.mp3`);
      if (!existsSync(serviceFile)) return NextResponse.json({ error: 'Expired', message: 'Recording expired. Please re-download.' }, { status: 404 });
      await ensureDir();
      outFile = path.join(TEMP_DIR, `trim_${randomUUID()}.mp3`);
      const ff = ['-i', serviceFile];
      if (startTime !== undefined) ff.push('-ss', String(startTime));
      if (endTime !== undefined) ff.push('-to', String(endTime));
      ff.push('-ac', '1', '-ar', '16000', '-ab', '64k', '-f', 'mp3', outFile, '-y');
      await run('ffmpeg', ff);
      const buffer = await readFile(outFile);
      await cleanup(outFile);
      return new NextResponse(buffer, { headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': buffer.length.toString() } });
    }

    const id = videoId(url);
    if (!id) return NextResponse.json({ error: 'Invalid URL', message: 'Not a valid YouTube URL' }, { status: 400 });

    console.log(`[YT-Local] Fetching: ${id}`);
    const { stdout: infoJson } = await run('yt-dlp', ['--dump-json', '--no-download', '--no-warnings', url]);
    const info = JSON.parse(infoJson);
    const title = info.title || 'Unknown', duration = info.duration || 0, channel = info.channel || info.uploader || 'Unknown';

    const maxDur = downloadOnly ? MAX_SERVICE : MAX_DURATION;
    if (duration > maxDur && !(startTime !== undefined && endTime !== undefined))
      return NextResponse.json({ error: 'Too long', message: `Video is ${Math.round(duration / 60)} min. Max ${maxDur / 60} min.` }, { status: 400 });

    await ensureDir();
    const uid = randomUUID();
    rawFile = path.join(TEMP_DIR, `raw_${uid}.mp3`);

    console.log(`[YT-Local] Downloading: ${title}`);
    await run('yt-dlp', ['-x', '--audio-format', 'mp3', '--audio-quality', '0', '--no-warnings', '-o', rawFile, url]);

    if (downloadOnly) {
      const serviceFile = path.join(TEMP_DIR, `service_${uid}.mp3`);
      await run('ffmpeg', ['-i', rawFile, '-ac', '1', '-ar', '16000', '-ab', '64k', '-f', 'mp3', serviceFile, '-y']);
      await cleanup(rawFile);
      setTimeout(() => cleanup(serviceFile), 30 * 60 * 1000);
      return NextResponse.json({ tempId: uid, title, channel, duration });
    }

    outFile = path.join(TEMP_DIR, `${uid}.mp3`);
    const ff: string[] = ['-i', rawFile];
    if (startTime !== undefined && startTime > 0) ff.push('-ss', String(startTime));
    if (endTime !== undefined && endTime > 0) ff.push('-to', String(endTime));
    ff.push('-ac', '1', '-ar', '16000', '-ab', '64k', '-f', 'mp3', outFile, '-y');
    await run('ffmpeg', ff);

    const buffer = await readFile(outFile);
    await cleanup(rawFile, outFile);
    return new NextResponse(buffer, {
      headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': buffer.length.toString(), 'X-Video-Title': encodeURIComponent(title), 'X-Video-Channel': encodeURIComponent(channel), 'X-Video-Duration': String(duration) },
    });
  } catch (error) {
    await cleanup(rawFile, outFile);
    console.error('[YT-Local] Error:', error);
    return NextResponse.json({ error: 'Failed', message: error instanceof Error ? error.message : 'Download failed' }, { status: 500 });
  }
}

async function handleLocalGet(url: string): Promise<NextResponse> {
  try {
    const id = url ? videoId(url) : null;
    if (!id) return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    const { stdout } = await run('yt-dlp', ['--dump-json', '--no-download', '--no-warnings', url!]);
    const info = JSON.parse(stdout);
    return NextResponse.json({ title: info.title, duration: info.duration, channel: info.channel || info.uploader, thumbnail: info.thumbnail });
  } catch { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

// ============================================
// Routes
// ============================================
export async function POST(request: NextRequest) {
  const body = await request.json();
  if (IS_PRODUCTION) { 
    console.log('[YT] Production - feature limited'); 
    return handleProductionRequest(); 
  }
  console.log('[YT] Local mode (yt-dlp)');
  return handleLocalRequest(body);
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url).searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });
  if (IS_PRODUCTION) return handleProductionGet(url);
  return handleLocalGet(url);
}
