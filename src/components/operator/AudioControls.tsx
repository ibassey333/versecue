// ============================================
// Audio Controls Component
// Microphone selection and level metering
// ============================================

'use client';

import { useState } from 'react';
import { Mic, MicOff, Volume2, Settings, Pause, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/stores/session';
import { AudioDevice } from '@/types';

interface AudioControlsProps {
  devices: AudioDevice[];
  isSupported: boolean;
  error: string | null;
  audioLevel: number;
  className?: string;
}

export function AudioControls({
  devices,
  isSupported,
  error,
  audioLevel,
  className,
}: AudioControlsProps) {
  const [showSettings, setShowSettings] = useState(false);
  
  const {
    isListening,
    isPaused,
    selectedAudioDevice,
    toggleListening,
    togglePause,
    setAudioDevice,
  } = useSessionStore();
  
  // Level meter bars
  const levelBars = 20;
  const activeBars = Math.floor(audioLevel * levelBars);
  
  return (
    <div className={cn(
      'rounded-xl border border-verse-border bg-verse-surface p-5',
      className
    )}>
      {/* Main controls */}
      <div className="flex items-center gap-4">
        {/* Listen toggle button */}
        <button
          onClick={toggleListening}
          disabled={!isSupported}
          className={cn(
            'flex items-center gap-3 px-6 py-3 rounded-xl font-semibold text-sm',
            'transition-all duration-300',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-verse-surface',
            isListening
              ? 'bg-status-listening text-white focus:ring-status-listening/50 shadow-lg shadow-status-listening/30'
              : 'bg-confidence-high text-white hover:bg-confidence-high/90 focus:ring-confidence-high/50',
            !isSupported && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isListening ? (
            <>
              <MicOff className="w-5 h-5" />
              <span>Stop Listening</span>
              <span className="w-2 h-2 rounded-full bg-white animate-pulse-gentle" />
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              <span>Start Listening</span>
            </>
          )}
        </button>
        
        {/* Pause/Resume button */}
        {isListening && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={togglePause}
            className={cn(
              'flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm',
              'border transition-all duration-200',
              isPaused
                ? 'bg-status-paused/10 border-status-paused text-status-paused hover:bg-status-paused/20'
                : 'bg-verse-border/50 border-verse-border text-verse-text hover:bg-verse-border'
            )}
          >
            {isPaused ? (
              <>
                <Play className="w-4 h-4" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </>
            )}
            <kbd className="ml-1 text-[10px] opacity-60 font-mono">space</kbd>
          </motion.button>
        )}
        
        {/* Level meter */}
        {isListening && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            className="flex items-center gap-3 px-4"
          >
            <Volume2 className="w-4 h-4 text-verse-muted" />
            <div className="flex items-end gap-0.5 h-6">
              {Array.from({ length: levelBars }).map((_, i) => (
                <motion.div
                  key={i}
                  className={cn(
                    'w-1 rounded-full transition-all duration-75',
                    i < activeBars
                      ? i < levelBars * 0.6
                        ? 'bg-confidence-high'
                        : i < levelBars * 0.85
                          ? 'bg-confidence-medium'
                          : 'bg-status-listening'
                      : 'bg-verse-border'
                  )}
                  style={{
                    height: `${((i + 1) / levelBars) * 100}%`,
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
        
        {/* Settings toggle */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={cn(
            'p-3 rounded-xl transition-colors',
            'text-verse-muted hover:text-verse-text hover:bg-verse-border/50',
            showSettings && 'bg-verse-border text-verse-text'
          )}
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
      
      {/* Error message */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-sm text-status-listening"
        >
          {error}
        </motion.p>
      )}
      
      {/* Settings panel */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 pt-4 border-t border-verse-border"
        >
          <label className="block">
            <span className="text-xs font-medium text-verse-subtle uppercase tracking-wide">
              Audio Input Device
            </span>
            <select
              value={selectedAudioDevice || ''}
              onChange={(e) => setAudioDevice(e.target.value)}
              className={cn(
                'mt-2 w-full px-4 py-3 rounded-xl',
                'bg-verse-bg border border-verse-border',
                'text-verse-text text-sm font-body',
                'focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500',
                'transition-all duration-200'
              )}
            >
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          </label>
          
          <p className="mt-3 text-[11px] text-verse-muted leading-relaxed">
            <strong className="text-verse-subtle">Pro tip:</strong> For best results, connect your 
            sound mixer's aux output to a USB audio interface. This provides cleaner audio 
            without room echo or congregation noise.
          </p>
        </motion.div>
      )}
    </div>
  );
}
