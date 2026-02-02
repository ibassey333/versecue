import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import os from 'os';

const TEMP_DIR = path.join(os.tmpdir(), 'versecue-imports');
const MAX_DURATION = 30 * 60;
const PATH_EXT = '/opt/homebrew/bin:/usr/local/bin:/usr/bin';

function videoId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([\w-]+)/,
    /youtu\.be\/([\w-]+)/,
    /youtube\.com\/embed\/([\w-]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

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
      code === 0 ? resolve({ stdout, stderr }) : reject(new Error(stderr.slice(-500) || `Exit ${code}`))
    );
    proc.on('error', reject);
  });
}

async function ensureDir() {
  if (!existsSync(TEMP_DIR)) await mkdir(TEMP_DIR, { recursive: true });
}

async function cleanup(...paths: (string | null)[]) {
  for (const p of paths) {
    if (p && existsSync(p)) await unlink(p).catch(() => {});
  }
}

export async function POST(request: NextRequest) {
  let rawFile: string | null = null;
  let outFile: string | null = null;

  try {
    const { url, startTime, endTime } = await request.json();
    const id = videoId(url);
    if (!id) {
      return NextResponse.json({ error: 'Invalid URL', message: 'Not a valid YouTube URL' }, { status: 400 });
    }

    // Get video info
    console.log(`[YT] Fetching info for ${id}...`);
    const { stdout: infoJson } = await run('yt-dlp', [
      '--dump-json', '--no-download', '--no-warnings', url,
    ]);
    const info = JSON.parse(infoJson);
    const title = info.title || 'Unknown';
    const duration = info.duration || 0;
    const channel = info.channel || info.uploader || 'Unknown';

    if (duration > MAX_DURATION && !(startTime !== undefined && endTime !== undefined)) {
      return NextResponse.json({
        error: 'Too long',
        message: `Video is ${Math.round(duration / 60)} min. Max ${MAX_DURATION / 60} min. Use time range.`,
      }, { status: 400 });
    }

    await ensureDir();
    const uid = randomUUID();
    rawFile = path.join(TEMP_DIR, `raw_${uid}.mp3`);
    outFile = path.join(TEMP_DIR, `${uid}.mp3`);

    // Step 1: Download
    console.log(`[YT] Downloading: ${title}`);
    await run('yt-dlp', [
      '-x', '--audio-format', 'mp3', '--audio-quality', '0',
      '--no-warnings', '-o', rawFile, url,
    ]);

    // Step 2: Compress + optional trim with ffmpeg
    const ff: string[] = ['-i', rawFile];
    if (startTime !== undefined && startTime > 0) ff.push('-ss', String(startTime));
    if (endTime !== undefined && endTime > 0) ff.push('-to', String(endTime));
    ff.push('-ac', '1', '-ar', '16000', '-ab', '64k', '-f', 'mp3', outFile, '-y');

    console.log('[YT] Compressing + trimming...');
    await run('ffmpeg', ff);

    const buffer = await readFile(outFile);
    console.log(`[YT] Ready: ${(buffer.length / 1024 / 1024).toFixed(1)}MB`);
    await cleanup(rawFile, outFile);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
        'X-Video-Title': encodeURIComponent(title),
        'X-Video-Channel': encodeURIComponent(channel),
        'X-Video-Duration': String(duration),
      },
    });
  } catch (error) {
    await cleanup(rawFile, outFile);
    console.error('[YT] Error:', error);
    return NextResponse.json(
      { error: 'Failed', message: error instanceof Error ? error.message : 'Download failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url).searchParams.get('url');
    const id = url ? videoId(url) : null;
    if (!id) return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    const { stdout } = await run('yt-dlp', ['--dump-json', '--no-download', '--no-warnings', url!]);
    const info = JSON.parse(stdout);
    return NextResponse.json({
      title: info.title, duration: info.duration,
      channel: info.channel || info.uploader, thumbnail: info.thumbnail,
    });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
