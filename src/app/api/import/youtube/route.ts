import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import os from 'os';

// ============================================================================
// TYPES
// ============================================================================

interface YouTubeDownloadRequest {
  url: string;
  startTime?: number;
  endTime?: number;
}

interface VideoInfo {
  title: string;
  duration: number;
  channel: string;
  thumbnail: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_DURATION = 30 * 60; // 30 minutes max
const TEMP_DIR = path.join(os.tmpdir(), 'versecue-imports');

const YOUTUBE_PATTERNS = [
  /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=([\w-]+)/,
  /^(https?:\/\/)?(www\.)?youtu\.be\/([\w-]+)/,
  /^(https?:\/\/)?(www\.)?youtube\.com\/embed\/([\w-]+)/,
  /^(https?:\/\/)?(www\.)?youtube\.com\/v\/([\w-]+)/,
];

// Common paths where yt-dlp and ffmpeg might be installed
const EXTRA_PATHS = [
  '/opt/homebrew/bin',
  '/usr/local/bin',
  '/usr/bin',
  path.join(os.homedir(), '.local/bin'),
  path.join(os.homedir(), 'bin'),
].join(':');

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractVideoId(url: string): string | null {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match) {
      return match[3];
    }
  }
  return null;
}

async function ensureTempDir(): Promise<void> {
  if (!existsSync(TEMP_DIR)) {
    await mkdir(TEMP_DIR, { recursive: true });
  }
}

function runCommand(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      PATH: `${EXTRA_PATHS}:${process.env.PATH || ''}`,
    };

    console.log(`Running: ${command} ${args.join(' ')}`);
    
    const proc = spawn(command, args, {
      env,
      shell: true,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        console.error('Command failed:', stderr);
        reject(new Error(stderr || `Command exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

async function getVideoInfo(url: string): Promise<VideoInfo> {
  try {
    const { stdout } = await runCommand('yt-dlp', [
      '--dump-json',
      '--no-download',
      '--no-warnings',
      url,
    ]);

    const info = JSON.parse(stdout);
    return {
      title: info.title || 'Unknown',
      duration: info.duration || 0,
      channel: info.channel || info.uploader || 'Unknown',
      thumbnail: info.thumbnail || '',
    };
  } catch (error) {
    console.error('Failed to get video info:', error);
    throw new Error('Could not retrieve video information. The video may be private or unavailable.');
  }
}

async function downloadAudio(url: string, outputPath: string): Promise<void> {
  await runCommand('yt-dlp', [
    '-x',
    '--audio-format', 'mp3',
    '--audio-quality', '0',
    '--no-warnings',
    '-o', outputPath,
    url,
  ]);
}

async function cleanupFile(filePath: string): Promise<void> {
  try {
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;

  try {
    const body: YouTubeDownloadRequest = await request.json();
    const { url, startTime, endTime } = body;

    // Validate URL
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required', message: 'Please provide a YouTube URL' },
        { status: 400 }
      );
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid URL', message: 'Please provide a valid YouTube URL' },
        { status: 400 }
      );
    }

    console.log(`Processing YouTube video: ${videoId}`);

    // Get video info first
    const videoInfo = await getVideoInfo(url);
    console.log(`Video: "${videoInfo.title}" (${videoInfo.duration}s)`);

    // Check duration
    if (videoInfo.duration > MAX_DURATION) {
      const maxMins = MAX_DURATION / 60;
      return NextResponse.json(
        {
          error: 'Video too long',
          message: `Video is ${Math.round(videoInfo.duration / 60)} minutes. Maximum is ${maxMins} minutes.`,
        },
        { status: 400 }
      );
    }

    // Ensure temp directory exists
    await ensureTempDir();

    // Generate unique filename
    const uniqueId = randomUUID();
    tempFilePath = path.join(TEMP_DIR, `${uniqueId}.mp3`);

    // Download audio
    console.log('Downloading audio...');
    await downloadAudio(url, tempFilePath);

    // Read the file
    const audioBuffer = await readFile(tempFilePath);
    console.log(`Downloaded ${audioBuffer.length} bytes`);

    // Clean up temp file
    await cleanupFile(tempFilePath);

    // Return audio with metadata headers
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'X-Video-Title': encodeURIComponent(videoInfo.title),
        'X-Video-Channel': encodeURIComponent(videoInfo.channel),
        'X-Video-Duration': videoInfo.duration.toString(),
      },
    });
  } catch (error) {
    // Clean up on error
    if (tempFilePath) {
      await cleanupFile(tempFilePath);
    }

    console.error('YouTube download error:', error);

    const message = error instanceof Error ? error.message : 'Failed to download audio';

    return NextResponse.json(
      { error: 'Download failed', message },
      { status: 500 }
    );
  }
}

// ============================================================================
// VIDEO INFO ENDPOINT (GET)
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    const videoInfo = await getVideoInfo(url);

    return NextResponse.json(videoInfo);
  } catch (error) {
    console.error('Video info error:', error);
    return NextResponse.json({ error: 'Failed to get video info' }, { status: 500 });
  }
}
