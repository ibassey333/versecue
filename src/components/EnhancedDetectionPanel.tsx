"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Check, X, Music, Library, Star, Loader2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorshipDetection } from '@/hooks/useWorshipDetection';
import { useSessionStore } from '@/stores/session';
import { Song, SongMatch } from '@/types';

// ============================================
// Time Options
// ============================================
const TIME_OPTIONS = [
  { value: 10, label: '10s' },
  { value: 15, label: '15s' },
  { value: 20, label: '20s' },
  { value: 30, label: '30s' },
  { value: 0, label: 'Manual' },
];

// ============================================
// Small Popover Time Selector
// ============================================
function TimeSelector({ 
  isOpen, 
  onClose, 
  value, 
  onChange 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  value: number; 
  onChange: (val: number) => void;
}) {
  if (!isOpen) return null;
  
  return (
    <>
      {/* Invisible backdrop to catch clicks */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      
      {/* Popover */}
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="absolute right-0 top-full mt-2 z-50 w-24 bg-verse-elevated border border-verse-border rounded-xl shadow-xl overflow-hidden"
      >
        {TIME_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              onChange(opt.value);
              onClose();
            }}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors",
              value === opt.value
                ? "bg-gold-500/20 text-gold-400"
                : "text-verse-text hover:bg-verse-border"
            )}
          >
            <span className="text-sm font-medium">{opt.label}</span>
            {value === opt.value && (
              <Check className="w-4 h-4 text-gold-400" />
            )}
          </button>
        ))}
      </motion.div>
    </>
  );
}

// ============================================
// Animated Recording Indicator
// ============================================
function RecordingAnimation({ isRecording }: { isRecording: boolean }) {
  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      {/* Outer glow */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gold-500/20"
        animate={isRecording ? {
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.1, 0.3],
        } : { scale: 1, opacity: 0 }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Ring 3 (outermost) */}
      <motion.div
        className="absolute w-28 h-28 rounded-full border-2 border-gold-500/30"
        animate={isRecording ? {
          scale: [1, 1.15, 1],
          opacity: [0.5, 0.2, 0.5],
        } : { scale: 1, opacity: 0.2 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
      />
      
      {/* Ring 2 */}
      <motion.div
        className="absolute w-20 h-20 rounded-full border-2 border-gold-500/50"
        animate={isRecording ? {
          scale: [1, 1.1, 1],
          opacity: [0.7, 0.3, 0.7],
        } : { scale: 1, opacity: 0.3 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
      />
      
      {/* Ring 1 (innermost) */}
      <motion.div
        className="absolute w-14 h-14 rounded-full border-2 border-gold-500/70"
        animate={isRecording ? {
          scale: [1, 1.05, 1],
          opacity: [1, 0.5, 1],
        } : { scale: 1, opacity: 0.4 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Center mic button */}
      <motion.div
        className={cn(
          "relative z-10 w-14 h-14 rounded-full flex items-center justify-center",
          "shadow-lg transition-colors duration-300",
          isRecording 
            ? "bg-gradient-to-br from-gold-400 to-gold-600 shadow-gold-500/50" 
            : "bg-verse-elevated border border-verse-border"
        )}
        animate={isRecording ? { scale: [1, 0.95, 1] } : { scale: 1 }}
        transition={{ duration: 0.5, repeat: isRecording ? Infinity : 0 }}
      >
        <Mic className={cn(
          "w-6 h-6 transition-colors",
          isRecording ? "text-verse-bg" : "text-verse-muted"
        )} />
      </motion.div>
    </div>
  );
}

// ============================================
// Processing Animation
// ============================================
function ProcessingAnimation() {
  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      {/* Spinning ring */}
      <motion.div
        className="absolute w-24 h-24 rounded-full border-2 border-transparent border-t-gold-500 border-r-gold-500/50"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Center */}
      <div className="relative z-10 w-14 h-14 rounded-full bg-verse-elevated border border-verse-border flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-gold-500 animate-spin" />
      </div>
    </div>
  );
}

// ============================================
// Confidence Ring
// ============================================
function ConfidenceRing({ confidence, size = 64 }: { confidence: number; size?: number }) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (confidence / 100) * circumference;
  
  const getColor = (conf: number) => {
    if (conf >= 90) return '#22c55e';
    if (conf >= 70) return '#d4af37';
    return '#f59e0b';
  };
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-verse-border"
        />
      </svg>
      
      <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor(confidence)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          className="text-sm font-bold text-verse-text"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          {confidence}%
        </motion.span>
      </div>
    </div>
  );
}

// ============================================
// Typing Effect for Transcribed Text
// ============================================
function TypingText({ text, className }: { text: string; className?: string }) {
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  
  useEffect(() => {
    if (!text) {
      setDisplayedText('');
      return;
    }
    
    let index = 0;
    setDisplayedText('');
    
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        setTimeout(() => setShowCursor(false), 500);
      }
    }, 30);
    
    return () => clearInterval(interval);
  }, [text]);
  
  return (
    <span className={className}>
      {displayedText}
      {showCursor && (
        <motion.span
          className="inline-block w-0.5 h-4 bg-gold-500 ml-0.5"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}
    </span>
  );
}

// ============================================
// Top Match Card
// ============================================
interface TopMatchCardProps {
  match: SongMatch;
  isInSetlist: boolean;
  onConfirm: () => void;
  onReject: () => void;
}

function TopMatchCard({ match, isInSetlist, onConfirm, onReject }: TopMatchCardProps) {
  const confidencePercent = Math.round((match.confidence || 0.8) * 100);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-verse-bg border border-verse-border rounded-2xl p-5 shadow-xl"
    >
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          <ConfidenceRing confidence={confidencePercent} size={72} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-lg font-semibold text-verse-text truncate">
            {match.song.title}
          </h4>
          <p className="text-sm text-verse-muted truncate">{match.song.artist}</p>
          
          <div className="flex items-center gap-2 mt-2">
            {match.source === 'local' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs">
                <Library className="w-3 h-3" />
                Library
              </span>
            )}
            {isInSetlist && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gold-500/20 text-gold-400 rounded-full text-xs">
                <Star className="w-3 h-3" />
                In Setlist
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex gap-3 mt-5">
        <motion.button
          onClick={onConfirm}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-gold-500 to-gold-600 text-verse-bg font-semibold rounded-xl shadow-lg shadow-gold-500/25 hover:shadow-gold-500/40 transition-shadow"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Check className="w-5 h-5" />
          Yes, Load It
        </motion.button>
        
        <motion.button
          onClick={onReject}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-verse-elevated border border-verse-border text-verse-muted font-medium rounded-xl hover:bg-verse-border hover:text-verse-text transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <X className="w-5 h-5" />
          Not This
        </motion.button>
      </div>
    </motion.div>
  );
}

// ============================================
// Other Matches List
// ============================================
interface OtherMatchesProps {
  matches: SongMatch[];
  onSelect: (match: SongMatch) => void;
}

function OtherMatches({ matches, onSelect }: OtherMatchesProps) {
  if (matches.length === 0) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="mt-4"
    >
      <p className="text-xs text-verse-subtle uppercase tracking-wider mb-2 px-1">
        Other Matches
      </p>
      <div className="space-y-2">
        {matches.map((match, index) => (
          <motion.button
            key={match.song.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * index }}
            onClick={() => onSelect(match)}
            className="w-full flex items-center gap-3 p-3 bg-verse-bg hover:bg-verse-elevated border border-verse-border hover:border-gold-500/30 rounded-xl text-left transition-all group"
          >
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
              match.source === 'local' ? 'bg-green-500/20' : 'bg-verse-border'
            )}>
              {match.source === 'local' ? (
                <Library className="w-4 h-4 text-green-400" />
              ) : (
                <Music className="w-4 h-4 text-verse-muted" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-verse-text truncate group-hover:text-gold-400 transition-colors">
                {match.song.title}
              </p>
              <p className="text-xs text-verse-muted truncate">{match.song.artist}</p>
            </div>
            <span className="text-xs text-verse-subtle">
              {Math.round((match.confidence || 0.8) * 100)}%
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// ============================================
// Loaded State (shows after confirmation)
// ============================================
function LoadedState({ song, onDetectAnother }: { song: Song; onDetectAnother: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center"
      >
        <Check className="w-8 h-8 text-green-400" />
      </motion.div>
      
      <p className="text-xs text-verse-subtle uppercase tracking-wider mb-1">Now Playing</p>
      <h4 className="text-lg font-semibold text-verse-text">{song.title}</h4>
      <p className="text-sm text-verse-muted">{song.artist}</p>
      
      <motion.button
        onClick={onDetectAnother}
        className="mt-6 px-6 py-2.5 bg-verse-elevated border border-verse-border text-verse-text text-sm font-medium rounded-xl hover:bg-verse-border transition-colors"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        Detect Another Song
      </motion.button>
    </motion.div>
  );
}

// ============================================
// Main Enhanced Detection Panel
// ============================================
interface EnhancedDetectionPanelProps {
  onSongSelect: (song: Song) => void;
}

export function EnhancedDetectionPanel({ onSongSelect }: EnhancedDetectionPanelProps) {
  const worship = useSessionStore((s) => s.worship);
  const [autoStopSeconds, setAutoStopSeconds] = useState(15);
  const [showTimeSelector, setShowTimeSelector] = useState(false);
  const [loadedSong, setLoadedSong] = useState<Song | null>(null);
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());
  
  const {
    status,
    transcribedText,
    matches,
    error,
    isRecording,
    isProcessing,
    recordingTime,
    startRecording,
    stopRecording,
    reset,
  } = useWorshipDetection({ autoStopSeconds: autoStopSeconds || null });
  
  // Filter out rejected matches
  const filteredMatches = matches.filter(m => !rejectedIds.has(m.song.id));
  const topMatch = filteredMatches[0];
  const otherMatches = filteredMatches.slice(1, 4);
  
  // Check if top match is in setlist
  const isInSetlist = topMatch 
    ? worship.setlistQueue.some(item => item.song?.title?.toLowerCase() === topMatch.song.title.toLowerCase())
    : false;
  
  const handleMicClick = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      setRejectedIds(new Set());
      setLoadedSong(null);
      await startRecording();
    }
  };
  
  const handleConfirm = useCallback((match: SongMatch) => {
    onSongSelect(match.song);
    setLoadedSong(match.song);
  }, [onSongSelect]);
  
  const handleReject = useCallback(() => {
    if (topMatch) {
      setRejectedIds(prev => new Set([...prev, topMatch.song.id]));
    }
  }, [topMatch]);
  
  const handleSelectOther = useCallback((match: SongMatch) => {
    handleConfirm(match);
  }, [handleConfirm]);
  
  const handleDetectAnother = useCallback(() => {
    reset();
    setRejectedIds(new Set());
    setLoadedSong(null);
  }, [reset]);

  const getCurrentTimeLabel = () => {
    const opt = TIME_OPTIONS.find(o => o.value === autoStopSeconds);
    return opt?.label || '15s';
  };
  
  return (
    <>
      <div className="rounded-2xl border border-verse-border bg-verse-surface overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-verse-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gold-500 animate-pulse" />
            <h3 className="font-body text-sm font-semibold text-verse-text tracking-wide uppercase">
              Song Detection
            </h3>
            <span className="px-2 py-0.5 bg-gold-500/20 text-gold-400 text-[10px] font-medium rounded-full uppercase tracking-wider">
              Enhanced
            </span>
          </div>
          
          <div className="flex items-center gap-2 relative">
            {/* Time selector button */}
            {!loadedSong && status === 'idle' && (
              <>
                <motion.button
                  onClick={() => setShowTimeSelector(!showTimeSelector)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-verse-bg border border-verse-border rounded-lg text-xs text-verse-muted hover:text-verse-text hover:border-gold-500/50 transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Clock className="w-3 h-3" />
                  {getCurrentTimeLabel()}
                </motion.button>
                
                <AnimatePresence>
                  <TimeSelector
                    isOpen={showTimeSelector}
                    onClose={() => setShowTimeSelector(false)}
                    value={autoStopSeconds}
                    onChange={setAutoStopSeconds}
                  />
                </AnimatePresence>
              </>
            )}
            
            {/* Reset button */}
            {(status !== 'idle' || loadedSong) && !isRecording && (
              <button
                onClick={handleDetectAnother}
                className="text-xs text-verse-muted hover:text-verse-text transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>
        
        <div className="p-5">
          <AnimatePresence mode="wait">
            {/* Loaded State - After confirmation */}
            {loadedSong && (
              <LoadedState 
                key="loaded" 
                song={loadedSong} 
                onDetectAnother={handleDetectAnother} 
              />
            )}
            
            {/* Idle / Recording / Processing State */}
            {!loadedSong && (status === 'idle' || isRecording || isProcessing) && (
              <motion.div
                key="recording"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <div 
                  className="flex justify-center mb-4 cursor-pointer"
                  onClick={handleMicClick}
                >
                  {isProcessing ? (
                    <ProcessingAnimation />
                  ) : (
                    <RecordingAnimation isRecording={isRecording} />
                  )}
                </div>
                
                <motion.p
                  className="text-sm font-medium text-verse-text mb-1"
                  animate={{ opacity: isRecording ? [1, 0.7, 1] : 1 }}
                  transition={{ duration: 1.5, repeat: isRecording ? Infinity : 0 }}
                >
                  {isRecording ? 'Listening...' : isProcessing ? 'Processing...' : 'Tap to detect'}
                </motion.p>
                
                {isRecording && (
                  <p className="text-xs text-verse-muted">
                    {recordingTime}s {autoStopSeconds ? `/ ${autoStopSeconds}s` : ''}
                  </p>
                )}
                
                {transcribedText && !isRecording && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 bg-verse-bg rounded-xl border border-verse-border"
                  >
                    <p className="text-xs text-verse-subtle mb-1">Heard:</p>
                    <p className="text-sm text-verse-text italic">
                      "<TypingText text={transcribedText.slice(0, 100)} />"
                    </p>
                  </motion.div>
                )}
                
                {status === 'idle' && (
                  <p className="text-xs text-verse-subtle mt-4">
                    Sing or play the song near your device
                  </p>
                )}
              </motion.div>
            )}
            
            {/* Results State */}
            {!loadedSong && status === 'complete' && filteredMatches.length > 0 && (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {transcribedText && (
                  <div className="mb-4 p-2 bg-verse-bg rounded-lg">
                    <p className="text-xs text-verse-muted truncate">
                      Heard: "{transcribedText.slice(0, 60)}..."
                    </p>
                  </div>
                )}
                
                {topMatch && (
                  <TopMatchCard
                    match={topMatch}
                    isInSetlist={isInSetlist}
                    onConfirm={() => handleConfirm(topMatch)}
                    onReject={handleReject}
                  />
                )}
                
                <OtherMatches matches={otherMatches} onSelect={handleSelectOther} />
              </motion.div>
            )}
            
            {/* No Matches State */}
            {!loadedSong && status === 'complete' && filteredMatches.length === 0 && (
              <motion.div
                key="no-results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-8"
              >
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-verse-border flex items-center justify-center">
                  <Music className="w-6 h-6 text-verse-muted" />
                </div>
                <p className="text-sm text-verse-text mb-1">No matches found</p>
                <p className="text-xs text-verse-muted">Try singing more clearly or a different part</p>
                <button
                  onClick={handleDetectAnother}
                  className="mt-4 px-4 py-2 bg-verse-elevated border border-verse-border text-verse-text text-sm rounded-lg hover:bg-verse-border transition-colors"
                >
                  Try Again
                </button>
              </motion.div>
            )}
            
            {/* Error State */}
            {!loadedSong && status === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-8"
              >
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-500/20 flex items-center justify-center">
                  <X className="w-6 h-6 text-red-400" />
                </div>
                <p className="text-sm text-verse-text mb-1">{error || 'Something went wrong'}</p>
                <button
                  onClick={handleDetectAnother}
                  className="mt-4 px-4 py-2 bg-verse-elevated border border-verse-border text-verse-text text-sm rounded-lg hover:bg-verse-border transition-colors"
                >
                  Try Again
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      

    </>
  );
}
