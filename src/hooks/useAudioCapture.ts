// ============================================
// Audio Capture Hook - with debug logging
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
  
  const { isListening, isPaused, selectedAudioDevice, setAudioDevice } = useSessionStore();
  
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recognitionRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  
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
        console.error('Failed to get audio devices:', err);
        setError('Microphone access denied');
      }
    }
    
    getDevices();
  }, [selectedAudioDevice, setAudioDevice]);
  
  // Check for Web Speech API support
  useEffect(() => {
    const SpeechAPI = getSpeechRecognition();
    console.log('[VerseCue] Speech API available:', !!SpeechAPI);
    if (!SpeechAPI) {
      setIsSupported(false);
      setError('Speech recognition not supported. Use Chrome.');
    }
  }, []);
  
  // Update audio level
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const normalized = Math.min(average / 128, 1);
    
    options.onLevelChange(normalized);
    
    if (isListening) {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, [isListening, options]);
  
  // Start/stop
  useEffect(() => {
    // Cleanup function
    const cleanup = () => {
      console.log('[VerseCue] Cleaning up...');
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
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
    
    if (!isListening || !selectedAudioDevice) {
      cleanup();
      return;
    }
    
    console.log('[VerseCue] Starting capture...');
    
    async function startCapture() {
      try {
        // Audio stream for level meter
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: selectedAudioDevice ? { exact: selectedAudioDevice } : undefined },
        });
        mediaStreamRef.current = stream;
        console.log('[VerseCue] Got audio stream');
        
        // Audio context for level meter
        audioContextRef.current = new AudioContext();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        source.connect(analyserRef.current);
        updateAudioLevel();
        
        // Speech recognition
        const SpeechRecognitionAPI = getSpeechRecognition();
        if (!SpeechRecognitionAPI) {
          console.error('[VerseCue] No Speech API!');
          return;
        }
        
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;
        
        recognition.onstart = () => {
          console.log('[VerseCue] ✅ Recognition STARTED');
        };
        
        recognition.onaudiostart = () => {
          console.log('[VerseCue] Audio started');
        };
        
        recognition.onsoundstart = () => {
          console.log('[VerseCue] Sound detected');
        };
        
        recognition.onspeechstart = () => {
          console.log('[VerseCue] Speech detected!');
        };
        
        recognition.onresult = (event: any) => {
          console.log('[VerseCue] Got result!', event.results.length);
          
          if (isPaused) return;
          
          let interimText = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript;
            
            console.log('[VerseCue] Transcript:', transcript, 'Final:', result.isFinal);
            
            if (result.isFinal) {
              const segment: TranscriptSegment = {
                id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
          console.error('[VerseCue] Error:', event.error);
          // Only report non-routine errors
          if (event.error !== 'aborted' && event.error !== 'no-speech') {
            options.onError(new Error(event.error));
          }
        };
        
        recognition.onend = () => {
          console.log('[VerseCue] Recognition ended');
          // Restart if still listening
          if (isListening && recognitionRef.current) {
            console.log('[VerseCue] Restarting...');
            setTimeout(() => {
              try {
                recognitionRef.current?.start();
              } catch (e) {
                console.log('[VerseCue] Restart failed:', e);
              }
            }, 500);
          }
        };
        
        recognitionRef.current = recognition;
        
        try {
          recognition.start();
          console.log('[VerseCue] Called start()');
        } catch (e) {
          console.error('[VerseCue] Start failed:', e);
        }
        
        setError(null);
      } catch (err) {
        console.error('[VerseCue] Capture failed:', err);
        setError('Failed to access microphone');
        options.onError(err as Error);
      }
    }
    
    startCapture();
    
    return cleanup;
  }, [isListening, selectedAudioDevice]); // Removed isPaused and options to prevent re-runs
  
  return {
    devices,
    isSupported,
    error,
    selectedDevice: selectedAudioDevice,
    selectDevice: setAudioDevice,
  };
}
