// ============================================
// Audio Capture v3.1 - Fixed Deepgram Integration
// ============================================

"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { TranscriptSegment, AudioDevice } from '@/types';
import { useSessionStore } from '@/stores/session';

interface AudioCaptureOptions {
  onTranscript: (segment: TranscriptSegment) => void;
  onInterim?: (text: string) => void;
  onError?: (error: Error) => void;
  onLevelChange?: (level: number) => void;
}

export function useAudioCapture(options: AudioCaptureOptions) {
  const { onTranscript, onInterim, onError, onLevelChange } = options;
  
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isListening = useSessionStore((s) => s.isListening);
  const isPaused = useSessionStore((s) => s.isPaused);
  const settings = useSessionStore((s) => s.settings);
  const selectedAudioDevice = useSessionStore((s) => s.selectedAudioDevice);
  
  const recognitionRef = useRef<any>(null);
  const deepgramSocketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const isPausedRef = useRef(isPaused);
  const isActiveRef = useRef(false);
  
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);
  
  // Get audio devices
  useEffect(() => {
    async function getDevices() {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = allDevices
          .filter((d) => d.kind === 'audioinput')
          .map((d) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${d.deviceId.slice(0, 5)}`, kind: 'audioinput' as const }));
        setDevices(audioInputs);
      } catch (err) {
        console.error('[VerseCue] Failed to get devices:', err);
        setError('Microphone access denied');
        setIsSupported(false);
      }
    }
    getDevices();
  }, []);
  
  // Audio level monitoring
  const startAudioMonitoring = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice } } : true,
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalized = Math.min(average / 128, 1);
        onLevelChange?.(normalized);
        animationRef.current = requestAnimationFrame(updateLevel);
      };
      
      updateLevel();
      return stream;
    } catch (err) {
      console.error('[VerseCue] Audio monitoring error:', err);
      return null;
    }
  }, [selectedAudioDevice, onLevelChange]);
  
  // Browser Speech Recognition
  const startBrowserRecognition = useCallback(() => {
    console.log('[VerseCue] Starting BROWSER speech recognition...');
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser');
      setIsSupported(false);
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
    
    recognition.onresult = (event: any) => {
      if (isPausedRef.current) return;
      
      let interim = '';
      let final = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      
      if (interim) onInterim?.(interim);
      
      if (final) {
        const segment: TranscriptSegment = {
          id: `seg_${Date.now()}`,
          text: final,
          timestamp: new Date(),
          isFinal: true,
        };
        onTranscript(segment);
        onInterim?.('');
      }
    };
    
    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error('[VerseCue] Browser speech error:', event.error);
        onError?.(new Error(event.error));
      }
    };
    
    recognition.onend = () => {
      console.log('[VerseCue] Browser speech ended');
      if (isActiveRef.current && !isPausedRef.current) {
        setTimeout(() => {
          if (isActiveRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
              console.log('[VerseCue] Browser speech restarted');
            } catch (e) {}
          }
        }, 500);
      }
    };
    
    recognitionRef.current = recognition;
    
    try {
      recognition.start();
      console.log('[VerseCue] ✅ Browser speech recognition STARTED');
    } catch (err) {
      console.error('[VerseCue] Failed to start browser recognition:', err);
    }
  }, [onTranscript, onInterim, onError]);
  
  // Deepgram Speech Recognition
  const startDeepgramRecognition = useCallback(async () => {
    console.log('[VerseCue] Starting DEEPGRAM speech recognition...');
    
    const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_KEY;
    
    console.log('[VerseCue] Deepgram API key available:', !!apiKey);
    
    if (!apiKey) {
      console.warn('[VerseCue] ⚠️ No Deepgram API key - falling back to browser');
      setError('Deepgram API key not set - using browser');
      startBrowserRecognition();
      return;
    }
    
    try {
      // Get or reuse stream
      let stream = streamRef.current;
      if (!stream) {
        console.log('[VerseCue] Getting microphone for Deepgram...');
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
          } 
        });
        streamRef.current = stream;
      }
      
      console.log('[VerseCue] Connecting to Deepgram WebSocket...');
      
      const wsUrl = 'wss://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true&punctuate=true&interim_results=true&endpointing=300';
      
      const socket = new WebSocket(wsUrl, ['token', apiKey]);
      deepgramSocketRef.current = socket;
      
      socket.onopen = () => {
        console.log('[VerseCue] ✅ Deepgram WebSocket CONNECTED');
        
        // Check supported mime types
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : 'audio/mp4';
        
        console.log('[VerseCue] Using mime type:', mimeType);
        
        const mediaRecorder = new MediaRecorder(stream!, { mimeType });
        mediaRecorderRef.current = mediaRecorder;
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN && !isPausedRef.current) {
            socket.send(event.data);
          }
        };
        
        mediaRecorder.onerror = (e) => {
          console.error('[VerseCue] MediaRecorder error:', e);
        };
        
        mediaRecorder.start(250);
        console.log('[VerseCue] ✅ Deepgram MediaRecorder STARTED');
      };
      
      socket.onmessage = (event) => {
        if (isPausedRef.current) return;
        
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'Results') {
            const transcript = data.channel?.alternatives?.[0]?.transcript;
            const isFinal = data.is_final;
            
            if (transcript) {
              console.log('[VerseCue] Deepgram:', isFinal ? 'FINAL' : 'interim', '-', transcript.substring(0, 50));
              
              if (isFinal) {
                const segment: TranscriptSegment = {
                  id: `dg_${Date.now()}`,
                  text: transcript,
                  timestamp: new Date(),
                  isFinal: true,
                };
                onTranscript(segment);
                onInterim?.('');
              } else {
                onInterim?.(transcript);
              }
            }
          }
        } catch (err) {
          console.error('[VerseCue] Deepgram parse error:', err);
        }
      };
      
      socket.onerror = (event) => {
        console.error('[VerseCue] ❌ Deepgram WebSocket ERROR:', event);
        setError('Deepgram connection failed - using browser');
        startBrowserRecognition();
      };
      
      socket.onclose = (event) => {
        console.log('[VerseCue] Deepgram WebSocket closed:', event.code, event.reason);
        
        if (isActiveRef.current && event.code !== 1000) {
          console.log('[VerseCue] Unexpected close, reconnecting...');
          setTimeout(() => {
            if (isActiveRef.current) {
              startDeepgramRecognition();
            }
          }, 1000);
        }
      };
      
    } catch (err: any) {
      console.error('[VerseCue] ❌ Deepgram setup error:', err);
      setError('Deepgram failed - using browser');
      startBrowserRecognition();
    }
  }, [onTranscript, onInterim, startBrowserRecognition]);
  
  // Cleanup
  const cleanup = useCallback(() => {
    console.log('[VerseCue] Cleaning up audio capture...');
    isActiveRef.current = false;
    
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    
    if (mediaRecorderRef.current) {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
      mediaRecorderRef.current = null;
    }
    
    if (deepgramSocketRef.current) {
      deepgramSocketRef.current.close(1000);
      deepgramSocketRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    analyserRef.current = null;
    onLevelChange?.(0);
  }, [onLevelChange]);
  
  // Main effect - start/stop based on isListening
  useEffect(() => {
    console.log('[VerseCue] Audio effect triggered:', { isListening, provider: settings.speechProvider });
    
    if (isListening) {
      isActiveRef.current = true;
      setError(null);
      
      // Start audio monitoring first
      startAudioMonitoring().then(() => {
        console.log('[VerseCue] Audio monitoring started, now starting speech recognition...');
        console.log('[VerseCue] Selected provider:', settings.speechProvider);
        
        if (settings.speechProvider === 'deepgram') {
          console.log('[VerseCue] >>> Using DEEPGRAM <<<');
          startDeepgramRecognition();
        } else {
          console.log('[VerseCue] >>> Using BROWSER <<<');
          startBrowserRecognition();
        }
      });
    } else {
      cleanup();
    }
    
    return cleanup;
  }, [isListening]); // Only re-run when isListening changes
  
  // Handle provider change while listening
  useEffect(() => {
    if (isListening && isActiveRef.current) {
      console.log('[VerseCue] Provider changed while listening:', settings.speechProvider);
      // Don't auto-switch - user needs to stop and restart
    }
  }, [settings.speechProvider, isListening]);
  
  return { devices, isSupported, error };
}
