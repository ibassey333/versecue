#!/usr/bin/env python3
"""
Fix audio capture - prevent restart loop
"""
import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path) if os.path.dirname(path) else '.', exist_ok=True)
    with open(path, 'w') as f:
        f.write(content)
    print(f"✅ Created: {path}")

USE_AUDIO_CAPTURE = r'''// ============================================
// Audio Capture Hook
// Handles microphone input and Web Speech API
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
  const isStoppingRef = useRef(false);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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
    if (!getSpeechRecognition()) {
      setIsSupported(false);
      setError('Speech recognition not supported in this browser. Use Chrome.');
    }
  }, []);
  
  // Update audio level visualization
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const normalized = Math.min(average / 128, 1);
    
    options.onLevelChange(normalized);
    
    if (isListening && !isStoppingRef.current) {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, [isListening, options]);
  
  // Cleanup function
  const cleanup = useCallback(() => {
    isStoppingRef.current = true;
    
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore
      }
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
  }, []);
  
  // Start/stop audio capture
  useEffect(() => {
    if (!isListening || !selectedAudioDevice) {
      cleanup();
      return;
    }
    
    isStoppingRef.current = false;
    
    async function startCapture() {
      try {
        // Get audio stream for level metering
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: selectedAudioDevice ? { exact: selectedAudioDevice } : undefined,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        
        mediaStreamRef.current = stream;
        
        // Set up audio context for level metering
        audioContextRef.current = new AudioContext();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        source.connect(analyserRef.current);
        
        updateAudioLevel();
        
        // Set up speech recognition
        const SpeechRecognitionAPI = getSpeechRecognition();
        if (SpeechRecognitionAPI) {
          const recognition = new SpeechRecognitionAPI();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';
          
          recognition.onresult = (event: any) => {
            if (isPaused || isStoppingRef.current) return;
            
            let interimText = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const result = event.results[i];
              const transcript = result[0].transcript;
              
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
            // Only log non-aborted errors
            if (event.error !== 'aborted' && event.error !== 'no-speech') {
              console.error('Speech recognition error:', event.error);
              options.onError(new Error(`Speech recognition error: ${event.error}`));
            }
          };
          
          recognition.onend = () => {
            // Only restart if we're still supposed to be listening
            if (isListening && !isStoppingRef.current && !isPaused) {
              restartTimeoutRef.current = setTimeout(() => {
                if (isListening && !isStoppingRef.current && recognitionRef.current) {
                  try {
                    recognitionRef.current.start();
                  } catch (e) {
                    // Already started or other error, ignore
                  }
                }
              }, 300);
            }
          };
          
          recognitionRef.current = recognition;
          
          try {
            recognition.start();
          } catch (e) {
            console.error('Failed to start recognition:', e);
          }
        }
        
        setError(null);
      } catch (err) {
        console.error('Failed to start audio capture:', err);
        setError('Failed to access microphone');
        options.onError(err as Error);
      }
    }
    
    startCapture();
    
    return cleanup;
  }, [isListening, isPaused, selectedAudioDevice, options, updateAudioLevel, cleanup]);
  
  return {
    devices,
    isSupported,
    error,
    selectedDevice: selectedAudioDevice,
    selectDevice: setAudioDevice,
  };
}
'''

def main():
    print("=" * 60)
    print("Fixing Audio Capture Hook")
    print("=" * 60)
    
    write_file("src/hooks/useAudioCapture.ts", USE_AUDIO_CAPTURE)
    
    print("\n" + "=" * 60)
    print("Done! Hard refresh browser: Cmd+Shift+R")
    print("=" * 60)

if __name__ == "__main__":
    main()
