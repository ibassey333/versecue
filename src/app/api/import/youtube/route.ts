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
// Production: youtubei.js
// ============================================
async function getYoutubeInfo(vid: string) {
  try {
    const { Innertube } = await import('youtubei.js');
    const yt = await Innertube.create();
    
    console.log(`[YT-Prod] Fetching info for ${vid}...`);
    const info = await yt.getBasicInfo(vid);
    
    const title = info.basic_info?.title || 'Unknown';
    const channel = info.basic_info?.author || 'Unknown';
    const duration = info.basic_info?.duration || 0;
    
    // Get audio format
    const format = info.chooseFormat({ type: 'audio', quality: 'best' });
    
    if (!format?.decipher) {
      console.log('[YT-Prod] No audio format found');
      return null;
    }
    
    const audioUrl = format.decipher(yt.session.player);
    
    return { title, channel, duration, audioUrl };
  } catch (error) {
    console.error('[YT-Prod] youtubei.js error:', error);
    return null;
  }
}

async function handleProductionRequest(body: any): Promise<NextResponse> {
  const { url } = body;
  const id = videoId(url);
  if (!id) return NextResponse.json({ error: 'Invalid URL', message: 'Not a valid YouTube URL' }, { status: 400 });

  console.log(`[YT-Prod] Video: ${id}`);
  
  const info = await getYoutubeInfo(id);
  
  if (!info?.audioUrl) {
    return NextResponse.json({ 
      error: 'Extraction failed', 
      message: 'Unable to extract audio. YouTube may be blocking this request. Try again later or use a different video.' 
    }, { status: 503 });
  }

  console.log(`[YT-Prod] Got audio URL, downloading...`);
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    
    const response = await fetch(info.audioUrl, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    clearTimeout(timeout);
    
    if (!response.ok) {
      console.log(`[YT-Prod] Download failed: ${response.status}`);
      return NextResponse.json({ error: 'Download failed', message: 'Could not download audio stream' }, { status: 500 });
    }
    
    const buf = Buffer.from(await response.arrayBuffer());
    console.log(`[YT-Prod] Done: ${(buf.length / 1024 / 1024).toFixed(1)}MB`);

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'audio/webm',
        'Content-Length': buf.length.toString(),
        'X-Video-Title': encodeURIComponent(info.title),
        'X-Video-Channel': encodeURIComponent(info.channel),
        'X-Video-Duration': String(info.duration),
      },
    });
  } catch (error) {
    console.error('[YT-Prod] Download error:', error);
    return NextResponse.json({ error: 'Download failed', message: 'Network error during download' }, { status: 500 });
  }
}

async function handleProductionGet(url: string): Promise<NextResponse> {
  const id = videoId(url);
  if (!id) return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  
  const info = await getYoutubeInfo(id);
  if (info) {
    return NextResponse.json({ 
      title: info.title, 
      duration: info.duration, 
      channel: info.channel, 
      thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg` 
    });
  }
  return NextResponse.json({ error: 'Failed to get video info' }, { status: 500 });
}

// ============================================
// Local: yt-dlp
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
    console.log('[YT] Production mode (youtubei.js)'); 
    return handleProductionRequest(body); 
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
