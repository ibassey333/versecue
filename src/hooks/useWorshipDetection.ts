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
      console.log(`[Detection] Transcribed in ${Date.now() - startTime}ms`);
      
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
      
      const allMatches: SongMatch[] = [];
      const seen = new Set<string>();
      
      const addMatch = (title: string, artist: string, source: 'local' | 'lrclib', id?: string, lyrics?: string) => {
        const key = (title + artist).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (seen.has(key)) return;
        seen.add(key);
        
        allMatches.push({
          song: {
            id: id || `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title,
            artist,
            lyrics: lyrics || '', // May be empty - will fetch on selection
            source,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as Song,
          confidence: source === 'local' ? 1 : 0.9,
          source,
        });
      };
      
      // Run BOTH searches in parallel - don't wait for each other
      const [geniusResult, localResult] = await Promise.all([
        // GENIUS: Fast lyrics-to-title search
        fetch(`/api/genius/search?q=${encodeURIComponent(transcribedText.substring(0, 100))}`)
          .then(r => r.ok ? r.json() : { hits: [] })
          .catch(() => ({ hits: [] })),
        
        // LOCAL: Search your library
        fetch(`/api/songs/search-by-lyrics?lyrics=${encodeURIComponent(transcribedText)}&organizationId=${org?.id || ''}`)
          .then(r => r.ok ? r.json() : { songs: [] })
          .catch(() => ({ songs: [] })),
      ]);
      
      console.log(`[Detection] Searches completed in ${Date.now() - searchStart}ms`);
      
      // Add GENIUS results FIRST (most accurate for song identification)
      if (geniusResult.hits) {
        for (const hit of geniusResult.hits.slice(0, 5)) {
          addMatch(hit.title, hit.artist, 'lrclib', `genius_${hit.id}`);
        }
        console.log(`[Detection] Genius: ${geniusResult.hits.length} hits`);
      }
      
      // Add LOCAL results (your library)
      if (localResult.songs) {
        for (const song of localResult.songs.slice(0, 5)) {
          addMatch(song.title, song.artist || 'Unknown', 'local', song.id, song.lyrics);
        }
        console.log(`[Detection] Local: ${localResult.songs.length} songs`);
      }
      
      console.log(`[Detection] Total: ${allMatches.length} matches in ${Date.now() - startTime}ms`);
      
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
