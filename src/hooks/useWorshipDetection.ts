import { useState, useRef, useCallback, useEffect } from 'react';
import { Song, SongMatch } from '@/types';

interface DetectionState {
  status: 'idle' | 'recording' | 'transcribing' | 'identifying' | 'searching' | 'complete' | 'error';
  transcribedText: string;
  identifiedSong: {
    title: string;
    artist: string;
    confidence: string;
  } | null;
  matches: SongMatch[];
  error: string | null;
  recordingTime: number;
}

interface DetectionOptions {
  autoStopSeconds: number | null; // null = manual only
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

  // Cleanup function
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
  }, []);

  const processAudio = useCallback(async (audioBlob: Blob) => {
    try {
      // Step 1: Transcribe with Whisper
      setState(prev => ({ ...prev, status: 'transcribing' }));
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const transcribeResponse = await fetch('/api/worship/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      if (!transcribeResponse.ok) {
        throw new Error('Transcription failed');
      }
      
      const { text: transcribedText } = await transcribeResponse.json();
      
      if (!transcribedText || transcribedText.trim().length < 10) {
        setState(prev => ({ 
          ...prev, 
          status: 'error', 
          error: 'Could not transcribe audio. Try singing more clearly.' 
        }));
        return;
      }
      
      setState(prev => ({ ...prev, transcribedText }));
      console.log('[Detection] Transcribed:', transcribedText);
      
      // Step 2: Identify song with LLM
      setState(prev => ({ ...prev, status: 'identifying' }));
      
      const identifyResponse = await fetch('/api/worship/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lyrics: transcribedText }),
      });
      
      if (!identifyResponse.ok) {
        throw new Error('Identification failed');
      }
      
      const identified = await identifyResponse.json();
      
      if (identified.identified && identified.title) {
        setState(prev => ({ 
          ...prev, 
          identifiedSong: {
            title: identified.title,
            artist: identified.artist || 'Unknown',
            confidence: identified.confidence || 'medium',
          }
        }));
        
        // Step 3: Search for full lyrics - LOCAL LIBRARY FIRST, then LRCLib
        setState(prev => ({ ...prev, status: 'searching' }));
        
        const allMatches: SongMatch[] = [];
        
        // 3a: Search LOCAL LIBRARY by title (ignore artist - LLM might say "Unknown")
        try {
          const libraryResponse = await fetch(
            `/api/songs/search-by-title?title=${encodeURIComponent(identified.title)}&lyrics=${encodeURIComponent(transcribedText)}`
          );
          
          if (libraryResponse.ok) {
            const libraryData = await libraryResponse.json();
            
            if (libraryData.songs && libraryData.songs.length > 0) {
              const libraryMatches: SongMatch[] = libraryData.songs.map((song: any) => ({
                song: {
                  id: song.id,
                  title: song.title,
                  artist: song.artist || 'Unknown',
                  lyrics: song.lyrics || '',
                  source: 'library' as const,
                  createdAt: new Date(song.created_at),
                  updatedAt: new Date(song.updated_at),
                },
                confidence: song.title?.toLowerCase() === identified.title?.toLowerCase() ? 1 : 0.9,
                source: 'library' as const,
              }));
              allMatches.push(...libraryMatches);
            }
          }
        } catch (e) {
          console.log('[Detection] Library search failed, trying LRCLib');
        }
        
        // 3b: Search LRCLib as fallback
        if (allMatches.length < 5) {
          const seenLrcIds = new Set<string>();
          const seenTitles = new Set<string>();
          
          // First try: Search by title (short, just title + first artist name)
          try {
            const firstArtist = (identified.artist || '').split(',')[0].split('/')[0].trim();
            const titleQuery = `${identified.title} ${firstArtist}`.trim().substring(0, 50);
            console.log('[Detection] LRCLib title search:', titleQuery);
            
            const titleResponse = await fetch(
              `https://lrclib.net/api/search?q=${encodeURIComponent(titleQuery)}`
            );
            
            if (titleResponse.ok) {
              const titleData = await titleResponse.json();
              for (const item of titleData.slice(0, 3)) {
                const lrcId = `lrclib_${item.id}`;
                if (!seenLrcIds.has(lrcId)) {
                  seenLrcIds.add(lrcId);
                  allMatches.push({
                    song: {
                      id: lrcId,
                      title: item.trackName || item.name,
                      artist: item.artistName,
                      album: item.albumName,
                      lyrics: item.plainLyrics || '',
                      source: 'lrclib' as const,
                      sourceId: String(item.id),
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    },
                    confidence: 0.7,
                    source: 'lrclib' as const,
                  });
                }
              }
            }
          } catch (e) {
            console.log('[Detection] LRCLib title search failed');
          }
          
          // Second try: Search by LYRICS content (when LLM might be wrong)
          try {
            // Use first phrase of transcribed lyrics
            const lyricsQuery = transcribedText
              .split(/[,\.!?]/)[0]
              .trim()
              .substring(0, 60);
            
            if (lyricsQuery.length >= 15) {
              console.log('[Detection] LRCLib lyrics search:', lyricsQuery);
              
              const lyricsResponse = await fetch(
                `https://lrclib.net/api/search?q=${encodeURIComponent(lyricsQuery)}`
              );
              
              if (lyricsResponse.ok) {
                const lyricsData = await lyricsResponse.json();
                for (const item of lyricsData.slice(0, 3)) {
                  const lrcId = `lrclib_${item.id}`;
                  if (!seenLrcIds.has(lrcId)) {
                    seenLrcIds.add(lrcId);
                    allMatches.push({
                      song: {
                        id: lrcId,
                        title: item.trackName || item.name,
                        artist: item.artistName,
                        album: item.albumName,
                        lyrics: item.plainLyrics || '',
                        source: 'lrclib' as const,
                        sourceId: String(item.id),
                        createdAt: new Date(),
                        updatedAt: new Date(),
                      },
                      confidence: 0.8,
                      source: 'lrclib' as const,
                    });
                  }
                }
              }
            }
          } catch (e) {
            console.log('[Detection] LRCLib lyrics search failed');
          }
        }
        
        setState(prev => ({ 
          ...prev, 
          status: 'complete',
          matches: allMatches,
        }));
      } else {
        setState(prev => ({ 
          ...prev, 
          status: 'error',
          error: 'Could not identify the song. Try a different section.',
        }));
      }
      
    } catch (error: any) {
      console.error('Processing error:', error);
      setState(prev => ({ 
        ...prev, 
        status: 'error', 
        error: error.message || 'Detection failed' 
      }));
    }
  }, []);

  const stopRecording = useCallback(async () => {
    cleanup();
    
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      return;
    }

    return new Promise<void>((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;
      
      mediaRecorder.onstop = async () => {
        // Stop all tracks
        streamRef.current?.getTracks().forEach(track => track.stop());
        
        // Create audio blob
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorder.mimeType 
        });
        
        console.log('[Detection] Recording stopped, size:', audioBlob.size);
        
        if (audioBlob.size < 1000) {
          setState(prev => ({ ...prev, status: 'error', error: 'Recording too short' }));
          resolve();
          return;
        }
        
        // Process the audio
        await processAudio(audioBlob);
        resolve();
      };
      
      mediaRecorder.stop();
    });
  }, [cleanup, processAudio]);

  // Store stopRecording in ref for auto-stop access
  useEffect(() => {
    stopFnRef.current = stopRecording;
  }, [stopRecording]);

  const startRecording = useCallback(async () => {
    try {
      setState(prev => ({ 
        ...prev, 
        status: 'recording', 
        error: null, 
        transcribedText: '', 
        identifiedSong: null, 
        matches: [],
        recordingTime: 0,
      }));
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        } 
      });
      
      streamRef.current = stream;
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      
      // Start recording timer
      timerRef.current = setInterval(() => {
        setState(prev => ({ ...prev, recordingTime: prev.recordingTime + 1 }));
      }, 1000);
      
      // Set auto-stop if enabled (delay by 1s to let recording stabilize)
      if (options.autoStopSeconds && options.autoStopSeconds > 0) {
        autoStopRef.current = setTimeout(() => {
          console.log('[Detection] Auto-stop triggered at', options.autoStopSeconds, 'seconds');
          if (stopFnRef.current) {
            stopFnRef.current();
          }
        }, (options.autoStopSeconds + 1) * 1000); // +1s buffer
      }
      
      console.log('[Detection] Recording started, auto-stop:', options.autoStopSeconds || 'disabled');
    } catch (error: any) {
      console.error('Recording error:', error);
      setState(prev => ({ ...prev, status: 'error', error: 'Could not access microphone' }));
    }
  }, [options.autoStopSeconds]);

  const reset = useCallback(() => {
    cleanup();
    
    // Stop any ongoing recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach(track => track.stop());
    
    setState({
      status: 'idle',
      transcribedText: '',
      identifiedSong: null,
      matches: [],
      error: null,
      recordingTime: 0,
    });
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [cleanup]);

  return {
    ...state,
    isRecording: state.status === 'recording',
    isProcessing: ['transcribing', 'identifying', 'searching'].includes(state.status),
    autoStopSeconds: options.autoStopSeconds,
    startRecording,
    stopRecording,
    reset,
  };
}
