import { useState, useRef, useCallback, useEffect } from 'react';
import { Song, SongMatch } from '@/types';

interface DetectionState {
  status: 'idle' | 'recording' | 'transcribing' | 'identifying' | 'searching' | 'complete' | 'error';
  transcribedText: string;
  identifiedSong: { title: string; artist: string; confidence: string; } | null;
  matches: SongMatch[];
  error: string | null;
  recordingTime: number;
}

interface DetectionOptions {
  autoStopSeconds: number | null;
}

export function useWorshipDetection(options: DetectionOptions = { autoStopSeconds: 10 }) {
  const [state, setState] = useState<DetectionState>({
    status: 'idle',
    transcribedText: '',
    identifiedSong: null,
    matches: [],
    error: null,
    recordingTime: 0,
  });
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoStopRef = useRef<NodeJS.Timeout | null>(null);
  const stopFnRef = useRef<(() => Promise<void>) | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
    timerRef.current = null;
    autoStopRef.current = null;
  }, []);

  const processAudio = useCallback(async (audioBlob: Blob) => {
    try {
      // Step 1: Transcribe
      setState(prev => ({ ...prev, status: 'transcribing' }));
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const transcribeResponse = await fetch('/api/worship/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      if (!transcribeResponse.ok) throw new Error('Transcription failed');
      
      const { text: transcribedText } = await transcribeResponse.json();
      
      if (!transcribedText || transcribedText.trim().length < 10) {
        setState(prev => ({ ...prev, status: 'error', error: 'Could not transcribe. Sing more clearly.' }));
        return;
      }
      
      setState(prev => ({ ...prev, transcribedText }));
      console.log('[Detection] Transcribed:', transcribedText);
      
      // Step 2: Identify with LLM
      setState(prev => ({ ...prev, status: 'identifying' }));
      
      const identifyResponse = await fetch('/api/worship/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lyrics: transcribedText }),
      });
      
      if (!identifyResponse.ok) throw new Error('Identification failed');
      
      const identified = await identifyResponse.json();
      
      if (!identified.identified || !identified.title) {
        setState(prev => ({ ...prev, status: 'error', error: 'Could not identify. Try different lyrics.' }));
        return;
      }
      
      setState(prev => ({ 
        ...prev, 
        identifiedSong: {
          title: identified.title,
          artist: identified.artist || 'Unknown',
          confidence: identified.confidence || 'medium',
        }
      }));
      
      // Step 3: Search - SIMPLE & FAST
      setState(prev => ({ ...prev, status: 'searching' }));
      
      const allMatches: SongMatch[] = [];
      const seen = new Set<string>();
      
      const addMatch = (song: any, source: 'local' | 'lrclib') => {
        const key = (song.title + song.artist).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (seen.has(key)) return;
        seen.add(key);
        allMatches.push({
          song: {
            id: song.id || `lrclib_${Date.now()}_${Math.random()}`,
            title: song.title,
            artist: song.artist || 'Unknown',
            lyrics: song.lyrics || '',
            source: source,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          confidence: source === 'local' ? 1 : 0.8,
          source: source,
        });
      };
      
      // Search 1: Local library (fast, parallel)
      const localPromise = fetch(
        `/api/songs/search-by-title?title=${encodeURIComponent(identified.title)}&lyrics=${encodeURIComponent(transcribedText.substring(0, 100))}`
      ).then(r => r.ok ? r.json() : { songs: [] }).catch(() => ({ songs: [] }));
      
      // Search 2: LRCLib with LYRICS (most reliable - finds song even if LLM title is wrong)
      const lyricsQuery = transcribedText.substring(0, 80);
      const lrcLyricsPromise = fetch(
        `https://lrclib.net/api/search?q=${encodeURIComponent(lyricsQuery)}`
      ).then(r => r.ok ? r.json() : []).catch(() => []);
      
      // Search 3: LRCLib with title (backup)
      const titleQuery = identified.title;
      const lrcTitlePromise = fetch(
        `https://lrclib.net/api/search?q=${encodeURIComponent(titleQuery)}`
      ).then(r => r.ok ? r.json() : []).catch(() => []);
      
      // Run ALL searches in parallel (fast!)
      const [localResult, lrcLyricsResult, lrcTitleResult] = await Promise.all([
        localPromise,
        lrcLyricsPromise,
        lrcTitlePromise,
      ]);
      
      console.log('[Detection] Local:', localResult.songs?.length || 0);
      console.log('[Detection] LRCLib lyrics:', lrcLyricsResult?.length || 0);
      console.log('[Detection] LRCLib title:', lrcTitleResult?.length || 0);
      
      // Add local matches first (priority)
      for (const song of (localResult.songs || [])) {
        addMatch({
          id: song.id,
          title: song.title,
          artist: song.artist,
          lyrics: song.lyrics,
        }, 'local');
      }
      
      // Add LRCLib lyrics matches (most accurate when LLM is wrong)
      for (const item of (lrcLyricsResult || []).slice(0, 5)) {
        addMatch({
          id: `lrclib_${item.id}`,
          title: item.trackName || item.name,
          artist: item.artistName,
          lyrics: item.plainLyrics || '',
        }, 'lrclib');
      }
      
      // Add LRCLib title matches
      for (const item of (lrcTitleResult || []).slice(0, 3)) {
        addMatch({
          id: `lrclib_${item.id}`,
          title: item.trackName || item.name,
          artist: item.artistName,
          lyrics: item.plainLyrics || '',
        }, 'lrclib');
      }
      
      console.log('[Detection] Total unique:', allMatches.length);
      
      setState(prev => ({ 
        ...prev, 
        status: 'complete',
        matches: allMatches.slice(0, 8),
      }));
      
    } catch (error: any) {
      console.error('[Detection] Error:', error);
      setState(prev => ({ ...prev, status: 'error', error: error.message || 'Detection failed' }));
    }
  }, []);

  const stopRecording = useCallback(async () => {
    cleanup();
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

    return new Promise<void>((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;
      
      mediaRecorder.onstop = async () => {
        streamRef.current?.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        
        if (audioBlob.size < 1000) {
          setState(prev => ({ ...prev, status: 'error', error: 'Recording too short' }));
          resolve();
          return;
        }
        
        await processAudio(audioBlob);
        resolve();
      };
      
      mediaRecorder.stop();
    });
  }, [cleanup, processAudio]);

  useEffect(() => { stopFnRef.current = stopRecording; }, [stopRecording]);

  const startRecording = useCallback(async () => {
    try {
      setState({
        status: 'recording',
        transcribedText: '',
        identifiedSong: null,
        matches: [],
        error: null,
        recordingTime: 0,
      });
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } 
      });
      
      streamRef.current = stream;
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });
      
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      
      timerRef.current = setInterval(() => {
        setState(prev => ({ ...prev, recordingTime: prev.recordingTime + 1 }));
      }, 1000);
      
      if (options.autoStopSeconds && options.autoStopSeconds > 0) {
        autoStopRef.current = setTimeout(() => {
          if (stopFnRef.current) stopFnRef.current();
        }, (options.autoStopSeconds + 1) * 1000);
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, status: 'error', error: 'Could not access microphone' }));
    }
  }, [options.autoStopSeconds]);

  const reset = useCallback(() => {
    cleanup();
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
    setState({ status: 'idle', transcribedText: '', identifiedSong: null, matches: [], error: null, recordingTime: 0 });
  }, [cleanup]);

  useEffect(() => {
    return () => { cleanup(); streamRef.current?.getTracks().forEach(track => track.stop()); };
  }, [cleanup]);

  return {
    ...state,
    isRecording: state.status === 'recording',
    isProcessing: ['transcribing', 'identifying', 'searching'].includes(state.status),
    startRecording,
    stopRecording,
    reset,
  };
}
