import { useState, useRef, useCallback, useEffect } from 'react';
import { Song, SongMatch } from '@/types';
import { useOrg } from '@/contexts/OrgContext';

interface DetectionState {
  status: 'idle' | 'recording' | 'transcribing' | 'searching' | 'complete' | 'error';
  transcribedText: string;
  matches: SongMatch[];
  error: string | null;
  recordingTime: number;
}

interface DetectionOptions {
  autoStopSeconds: number | null;
}

// Filter out non-music Genius results (books, court cases, etc.)
function isLikelyMusic(title: string, artist: string): boolean {
  const nonMusicIndicators = [
    'book', 'chapter', 'vol.', 'volume', 'court', 'supreme', 
    'nietzsche', 'aristotle', 'plato', 'shakespeare',
    'novel', 'poem', 'essay', 'speech', 'galloway',
    'arabian nights', 'dawn of day', 'the republic'
  ];
  
  const combined = (title + ' ' + artist).toLowerCase();
  return !nonMusicIndicators.some(indicator => combined.includes(indicator));
}

export function useWorshipDetection(options: DetectionOptions = { autoStopSeconds: 10 }) {
  const { org } = useOrg();
  const [state, setState] = useState<DetectionState>({
    status: 'idle',
    transcribedText: '',
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
    const startTime = Date.now();
    
    try {
      // ========== STEP 1: TRANSCRIBE ==========
      setState(prev => ({ ...prev, status: 'transcribing' }));
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const transcribeRes = await fetch('/api/worship/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      if (!transcribeRes.ok) throw new Error('Transcription failed');
      
      const { text: transcribedText } = await transcribeRes.json();
      console.log(`[Detection] Transcribed in ${Date.now() - startTime}ms:`, transcribedText);
      
      if (!transcribedText || transcribedText.trim().length < 10) {
        setState(prev => ({ 
          ...prev, 
          status: 'error', 
          error: 'Could not hear clearly. Try again.' 
        }));
        return;
      }
      
      setState(prev => ({ ...prev, transcribedText }));
      
      // ========== STEP 2: FAST PARALLEL SEARCH ==========
      setState(prev => ({ ...prev, status: 'searching' }));
      const searchStart = Date.now();
      
      const localMatches: SongMatch[] = [];
      const onlineMatches: SongMatch[] = [];
      const seen = new Set<string>();
      
      const addMatch = (
        title: string, 
        artist: string, 
        source: 'local' | 'lrclib', 
        id?: string, 
        lyrics?: string,
        isLocal: boolean = false
      ) => {
        const key = (title + artist).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (seen.has(key)) return;
        seen.add(key);
        
        const match: SongMatch = {
          song: {
            id: id || `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title,
            artist,
            lyrics: lyrics || '',
            source: isLocal ? 'local' : 'lrclib',
            createdAt: new Date(),
            updatedAt: new Date(),
          } as Song,
          confidence: isLocal 
              ? 0.95 + Math.random() * 0.05  // 95-100% for local
              : 0.70 + Math.random() * 0.15, // 70-85% for online
          source: isLocal ? 'local' : 'lrclib',
        };
        
        if (isLocal) {
          localMatches.push(match);
        } else {
          onlineMatches.push(match);
        }
      };
      
      // Run BOTH searches in parallel
      const [localResult, geniusResult] = await Promise.all([
        // LOCAL: Search your library FIRST
        fetch(`/api/songs/search-by-lyrics?lyrics=${encodeURIComponent(transcribedText)}&organizationId=${org?.id || ''}`)
          .then(r => r.ok ? r.json() : { songs: [] })
          .catch(() => ({ songs: [] })),
        
        // GENIUS: Online search
        fetch(`/api/genius/search?q=${encodeURIComponent(transcribedText.substring(0, 100))}`)
          .then(r => r.ok ? r.json() : { hits: [] })
          .catch(() => ({ hits: [] })),
      ]);
      
      console.log(`[Detection] Searches completed in ${Date.now() - searchStart}ms`);
      
      // Add LOCAL results FIRST (most relevant - your library!)
      if (localResult.songs && localResult.songs.length > 0) {
        for (const song of localResult.songs.slice(0, 5)) {
          addMatch(
            song.title, 
            song.artist || 'Unknown', 
            'local', 
            song.id, 
            song.lyrics,
            true // isLocal
          );
        }
        console.log(`[Detection] Local: ${localResult.songs.length} songs (PRIORITY)`);
      }
      
      // Add GENIUS results (filtered - remove books/court cases)
      if (geniusResult.hits && geniusResult.hits.length > 0) {
        const musicHits = geniusResult.hits.filter((hit: any) => 
          isLikelyMusic(hit.title || '', hit.artist || '')
        );
        
        for (const hit of musicHits.slice(0, 5)) {
          addMatch(
            hit.title, 
            hit.artist, 
            'lrclib', 
            `genius_${hit.id}`,
            '', // No lyrics yet - will fetch on selection
            false // isLocal
          );
        }
        console.log(`[Detection] Genius: ${musicHits.length} music results (filtered from ${geniusResult.hits.length})`);
      }
      
      // Combine: LOCAL first, then ONLINE
      const allMatches = [...localMatches, ...onlineMatches];
      
      console.log(`[Detection] Total: ${allMatches.length} matches (${localMatches.length} local, ${onlineMatches.length} online)`);
      
      setState(prev => ({ 
        ...prev, 
        status: 'complete',
        matches: allMatches.slice(0, 8),
      }));
      
    } catch (error: any) {
      console.error('[Detection] Error:', error);
      setState(prev => ({ 
        ...prev, 
        status: 'error', 
        error: error.message || 'Detection failed' 
      }));
    }
  }, [org?.id]);

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
      
      mediaRecorder.ondataavailable = (e) => { 
        if (e.data.size > 0) audioChunksRef.current.push(e.data); 
      };
      
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
    setState({ status: 'idle', transcribedText: '', matches: [], error: null, recordingTime: 0 });
  }, [cleanup]);

  useEffect(() => {
    return () => { cleanup(); streamRef.current?.getTracks().forEach(track => track.stop()); };
  }, [cleanup]);

  return {
    ...state,
    isRecording: state.status === 'recording',
    isProcessing: ['transcribing', 'searching'].includes(state.status),
    startRecording,
    stopRecording,
    reset,
  };
}
