// ============================================
// Audio Capture Hook v2.0 - FIXED
// ============================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioDevice, TranscriptSegment } from '@/types';
import { useSessionStore } from '@/stores/session';

interface AudioCaptureOptions {
  onTranscript: (segment: TranscriptSegment) => void;
  onInterim: (text: string) => void;
  onError: (error: Error) => void;
  onLevelChange: (level: number) => void;
}

function getSpeechRecognition(): any {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export function useAudioCapture(options: AudioCaptureOptions) {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isListening = useSessionStore((s) => s.isListening);
  const isPaused = useSessionStore((s) => s.isPaused);
  const selectedAudioDevice = useSessionStore((s) => s.selectedAudioDevice);
  const setAudioDevice = useSessionStore((s) => s.setAudioDevice);
  
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recognitionRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isPausedRef = useRef(isPaused);
  
  // Keep isPausedRef in sync
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);
  
  // Get available audio devices
  useEffect(() => {
    async function getDevices() {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = allDevices
          .filter(d => d.kind === 'audioinput')
          .map(d => ({
            deviceId: d.deviceId,
            label: d.label || `Microphone ${d.deviceId.slice(0, 8)}`,
            kind: 'audioinput' as const,
          }));
        
        setDevices(audioInputs);
        
        if (!selectedAudioDevice && audioInputs.length > 0) {
          setAudioDevice(audioInputs[0].deviceId);
        }
      } catch (err) {
        console.error('[VerseCue] Failed to get audio devices:', err);
        setError('Microphone access denied');
      }
    }
    
    getDevices();
  }, []);
  
  // Check for Speech API support
  useEffect(() => {
    const SpeechAPI = getSpeechRecognition();
    console.log('[VerseCue] Speech API available:', !!SpeechAPI);
    if (!SpeechAPI) {
      setIsSupported(false);
      setError('Speech recognition not supported. Use Chrome or Edge.');
    }
  }, []);
  
  // Update audio level meter
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const normalized = Math.min(average / 128, 1);
    
    options.onLevelChange(normalized);
    
    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, [options.onLevelChange]);
  
  // Main capture effect - FIXED: removed isPaused from dependencies
  useEffect(() => {
    const cleanup = () => {
      console.log('[VerseCue] Cleaning up audio capture...');
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) { /* ignore */ }
        recognitionRef.current = null;
      }
      
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (e) { /* ignore */ }
        audioContextRef.current = null;
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      options.onLevelChange(0);
    };
    
    if (!isListening || !selectedAudioDevice) {
      cleanup();
      return;
    }
    
    console.log('[VerseCue] Starting audio capture...');
    let isActive = true;
    
    async function startCapture() {
      try {
        // Get audio stream for level meter
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { 
            deviceId: selectedAudioDevice ? { exact: selectedAudioDevice } : undefined,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        
        if (!isActive) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        
        mediaStreamRef.current = stream;
        console.log('[VerseCue] Audio stream acquired');
        
        // Set up audio context for level meter
        audioContextRef.current = new AudioContext();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        source.connect(analyserRef.current);
        updateAudioLevel();
        
        // Set up speech recognition (Browser API)
        const SpeechRecognitionAPI = getSpeechRecognition();
        if (!SpeechRecognitionAPI) {
          console.error('[VerseCue] No Speech API available');
          setError('Speech recognition not available');
          return;
        }
        
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;
        
        recognition.onstart = () => {
          console.log('[VerseCue] ✅ Speech recognition started');
          setError(null);
        };
        
        recognition.onaudiostart = () => {
          console.log('[VerseCue] Audio input started');
        };
        
        recognition.onspeechstart = () => {
          console.log('[VerseCue] Speech detected');
        };
        
        recognition.onresult = (event: any) => {
          // Use ref to check paused state (avoids stale closure)
          if (isPausedRef.current) return;
          
          let interimText = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript;
            
            console.log('[VerseCue] Transcript:', transcript.substring(0, 50), '| Final:', result.isFinal);
            
            if (result.isFinal) {
              const segment: TranscriptSegment = {
                id: `seg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                text: transcript,
                timestamp: new Date(),
                isFinal: true,
                confidence: result[0].confidence,
              };
              options.onTranscript(segment);
              interimText = '';
            } else {
              interimText += transcript;
            }
          }
          
          if (interimText) {
            options.onInterim(interimText);
          }
        };
        
        recognition.onerror = (event: any) => {
          console.error('[VerseCue] Speech error:', event.error);
          if (event.error !== 'aborted' && event.error !== 'no-speech') {
            setError(`Speech error: ${event.error}`);
            options.onError(new Error(event.error));
          }
        };
        
        recognition.onend = () => {
          console.log('[VerseCue] Speech recognition ended');
          // Auto-restart if still listening and component is still active
          if (isActive && recognitionRef.current) {
            console.log('[VerseCue] Restarting recognition in 1s...');
            setTimeout(() => {
              if (isActive && recognitionRef.current) {
                try {
                  recognitionRef.current.start();
                } catch (e) {
                  console.log('[VerseCue] Restart failed:', e);
                }
              }
            }, 1000); // Increased delay to prevent tight loop
          }
        };
        
        recognitionRef.current = recognition;
        
        try {
          recognition.start();
          console.log('[VerseCue] Recognition.start() called');
        } catch (e) {
          console.error('[VerseCue] Failed to start recognition:', e);
          setError('Failed to start speech recognition');
        }
        
      } catch (err) {
        console.error('[VerseCue] Audio capture failed:', err);
        setError('Failed to access microphone');
        options.onError(err as Error);
      }
    }
    
    startCapture();
    
    return () => {
      isActive = false;
      cleanup();
    };
  }, [isListening, selectedAudioDevice]); // FIXED: Removed isPaused, options, updateAudioLevel
  
  return {
    devices,
    isSupported,
    error,
    selectedDevice: selectedAudioDevice,
    selectDevice: setAudioDevice,
  };
}
