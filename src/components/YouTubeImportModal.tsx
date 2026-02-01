'use client';

import { useState, useRef, useCallback } from 'react';
import {
  X,
  Youtube,
  Upload,
  FileAudio,
  Clock,
  Languages,
  Loader2,
  Check,
  AlertCircle,
  ChevronDown,
  Edit3,
  Save,
  Plus,
} from 'lucide-react';
// Organization ID passed as prop
import type { Song, SongSection } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

interface YouTubeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (song: Song) => void;
  organizationId?: string;
}

type ImportStep = 'input' | 'processing' | 'preview' | 'complete';
type SourceType = 'youtube' | 'file';

interface ImportState {
  step: ImportStep;
  sourceType: SourceType;
  url: string;
  file: File | null;
  title: string;
  artist: string;
  language: string;
  useTimeRange: boolean;
  startTime: string;
  endTime: string;
  progress: number;
  progressMessage: string;
  transcribedLyrics: string;
  formattedSections: SongSection[];
  detectedLanguage: string;
  detectedLanguages: string[];
  error: string | null;
}

interface ProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete' | 'error';
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LANGUAGES = {
  auto: { label: 'Auto-detect', flag: '🌐', category: 'recommended' },
  en: { label: 'English', flag: '🇬🇧', category: 'recent' },
  yo: { label: 'Yoruba', flag: '🇳🇬', category: 'african' },
  ig: { label: 'Igbo', flag: '🇳🇬', category: 'african' },
  ha: { label: 'Hausa', flag: '🇳🇬', category: 'african' },
  pcm: { label: 'Pidgin', flag: '🇳🇬', category: 'african' },
  sw: { label: 'Swahili', flag: '🇰🇪', category: 'african' },
  tw: { label: 'Twi', flag: '🇬🇭', category: 'african' },
  zu: { label: 'Zulu', flag: '🇿🇦', category: 'african' },
  am: { label: 'Amharic', flag: '🇪🇹', category: 'african' },
  es: { label: 'Spanish', flag: '🇪🇸', category: 'americas' },
  pt: { label: 'Portuguese', flag: '🇧🇷', category: 'americas' },
  fr: { label: 'French', flag: '🇫🇷', category: 'europe' },
  de: { label: 'German', flag: '🇩🇪', category: 'europe' },
  it: { label: 'Italian', flag: '🇮🇹', category: 'europe' },
  ko: { label: 'Korean', flag: '🇰🇷', category: 'asia' },
  zh: { label: 'Chinese', flag: '🇨🇳', category: 'asia' },
  ja: { label: 'Japanese', flag: '🇯🇵', category: 'asia' },
  hi: { label: 'Hindi', flag: '🇮🇳', category: 'asia' },
  id: { label: 'Indonesian', flag: '🇮🇩', category: 'asia' },
  ar: { label: 'Arabic', flag: '🇸🇦', category: 'asia' },
  ru: { label: 'Russian', flag: '🇷🇺', category: 'europe' },
  pl: { label: 'Polish', flag: '🇵🇱', category: 'europe' },
} as const;

const ACCEPTED_EXTENSIONS = '.mp4,.mov,.webm,.mkv,.mp3,.wav,.m4a,.ogg,.flac';

const INITIAL_STATE: ImportState = {
  step: 'input',
  sourceType: 'youtube',
  url: '',
  file: null,
  title: '',
  artist: '',
  language: 'auto',
  useTimeRange: false,
  startTime: '0:00:00',
  endTime: '0:05:00',
  progress: 0,
  progressMessage: '',
  transcribedLyrics: '',
  formattedSections: [],
  detectedLanguage: '',
  detectedLanguages: [],
  error: null,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function isValidYouTubeUrl(url: string): boolean {
  const patterns = [
    /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[\w-]+/,
    /^(https?:\/\/)?(www\.)?youtu\.be\/[\w-]+/,
    /^(https?:\/\/)?(www\.)?youtube\.com\/embed\/[\w-]+/,
    /^(https?:\/\/)?(www\.)?youtube\.com\/v\/[\w-]+/,
  ];
  return patterns.some((pattern) => pattern.test(url));
}

function parseTimeToSeconds(time: string): number {
  const parts = time.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] || 0;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function SourceSelector({
  sourceType,
  onChange,
}: {
  sourceType: SourceType;
  onChange: (type: SourceType) => void;
}) {
  return (
    <div className="flex gap-2 p-1 bg-verse-bg rounded-xl">
      <button
        onClick={() => onChange('youtube')}
        className={cn(
          'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all',
          sourceType === 'youtube'
            ? 'bg-verse-card text-verse-text shadow-sm'
            : 'text-verse-muted hover:text-verse-text'
        )}
      >
        <Youtube className="w-4 h-4" />
        <span className="font-medium">YouTube URL</span>
      </button>
      <button
        onClick={() => onChange('file')}
        className={cn(
          'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all',
          sourceType === 'file'
            ? 'bg-verse-card text-verse-text shadow-sm'
            : 'text-verse-muted hover:text-verse-text'
        )}
      >
        <Upload className="w-4 h-4" />
        <span className="font-medium">Upload File</span>
      </button>
    </div>
  );
}

function FileDropZone({
  file,
  onFileSelect,
  onFileClear,
  isDragging,
  onDragEnter,
  onDragLeave,
  onDrop,
}: {
  file: File | null;
  onFileSelect: (file: File) => void;
  onFileClear: () => void;
  isDragging: boolean;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  };

  if (file) {
    return (
      <div className="border border-verse-border rounded-xl p-4 bg-verse-bg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold-500/20 flex items-center justify-center">
            <FileAudio className="w-5 h-5 text-gold-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-verse-text font-medium truncate">{file.name}</p>
            <p className="text-verse-muted text-sm">{formatFileSize(file.size)}</p>
          </div>
          <button
            onClick={onFileClear}
            className="p-2 hover:bg-verse-border rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-verse-muted" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        'border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer',
        isDragging
          ? 'border-gold-500 bg-gold-500/10'
          : 'border-verse-border hover:border-verse-muted'
      )}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-verse-border flex items-center justify-center">
          <Upload className="w-6 h-6 text-verse-muted" />
        </div>
        <div>
          <p className="text-verse-text font-medium">
            Drop video or audio file here
          </p>
          <p className="text-verse-muted text-sm mt-1">
            or click to browse
          </p>
        </div>
        <p className="text-verse-muted text-xs">
          MP4, MOV, WEBM, MP3, WAV, M4A, OGG, FLAC
        </p>
      </div>
    </div>
  );
}

function LanguageSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (lang: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedLang = LANGUAGES[value as keyof typeof LANGUAGES];

  const filteredLanguages = Object.entries(LANGUAGES).filter(
    ([code, lang]) =>
      lang.label.toLowerCase().includes(search.toLowerCase()) ||
      code.toLowerCase().includes(search.toLowerCase())
  );

  const groupedLanguages = {
    recommended: filteredLanguages.filter(([, l]) => l.category === 'recommended'),
    african: filteredLanguages.filter(([, l]) => l.category === 'african'),
    americas: filteredLanguages.filter(([, l]) => l.category === 'americas'),
    europe: filteredLanguages.filter(([, l]) => l.category === 'europe'),
    asia: filteredLanguages.filter(([, l]) => l.category === 'asia'),
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-verse-bg border border-verse-border rounded-xl text-verse-text hover:border-verse-muted transition-colors"
      >
        <span className="flex items-center gap-2">
          <span>{selectedLang?.flag}</span>
          <span>{selectedLang?.label || 'Select language'}</span>
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-verse-muted transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-verse-card border border-verse-border rounded-xl shadow-xl z-50 max-h-80 overflow-hidden">
            <div className="p-2 border-b border-verse-border">
              <input
                type="text"
                placeholder="Search languages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 bg-verse-bg border border-verse-border rounded-lg text-verse-text placeholder-verse-muted text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto max-h-60 p-2">
              {Object.entries(groupedLanguages).map(([category, langs]) =>
                langs.length > 0 ? (
                  <div key={category} className="mb-2">
                    <p className="text-xs text-verse-muted uppercase tracking-wide px-2 py-1">
                      {category === 'recommended' && '⭐ Recommended'}
                      {category === 'african' && '🌍 African Languages'}
                      {category === 'americas' && '🌎 Americas'}
                      {category === 'europe' && '🌍 Europe'}
                      {category === 'asia' && '🌏 Asia'}
                    </p>
                    <div className="grid grid-cols-2 gap-1">
                      {langs.map(([code, lang]) => (
                        <button
                          key={code}
                          onClick={() => {
                            onChange(code);
                            setIsOpen(false);
                            setSearch('');
                          }}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                            value === code
                              ? 'bg-gold-500/20 text-gold-500'
                              : 'text-verse-text hover:bg-verse-border'
                          )}
                        >
                          <span>{lang.flag}</span>
                          <span className="truncate">{lang.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TimeRangeInput({
  enabled,
  onToggle,
  startTime,
  endTime,
  onStartChange,
  onEndChange,
}: {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  startTime: string;
  endTime: string;
  onStartChange: (time: string) => void;
  onEndChange: (time: string) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="w-4 h-4 rounded border-verse-border bg-verse-bg text-gold-500 focus:ring-gold-500 focus:ring-offset-0"
        />
        <span className="text-verse-text text-sm">
          Extract only a section (for long videos)
        </span>
      </label>

      {enabled && (
        <div className="flex items-center gap-3 pl-7">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-verse-muted" />
            <span className="text-verse-muted text-sm">Start:</span>
            <input
              type="text"
              value={startTime}
              onChange={(e) => onStartChange(e.target.value)}
              placeholder="0:00:00"
              className="w-24 px-3 py-1.5 bg-verse-bg border border-verse-border rounded-lg text-verse-text text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-verse-muted text-sm">End:</span>
            <input
              type="text"
              value={endTime}
              onChange={(e) => onEndChange(e.target.value)}
              placeholder="0:05:00"
              className="w-24 px-3 py-1.5 bg-verse-bg border border-verse-border rounded-lg text-verse-text text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ProcessingProgress({
  steps,
  progress,
  message,
}: {
  steps: ProgressStep[];
  progress: number;
  message: string;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center gap-3">
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center',
                step.status === 'complete' && 'bg-green-500',
                step.status === 'active' && 'bg-gold-500',
                step.status === 'pending' && 'bg-verse-border',
                step.status === 'error' && 'bg-red-500'
              )}
            >
              {step.status === 'complete' && (
                <Check className="w-3.5 h-3.5 text-white" />
              )}
              {step.status === 'active' && (
                <Loader2 className="w-3.5 h-3.5 text-verse-bg animate-spin" />
              )}
              {step.status === 'error' && (
                <X className="w-3.5 h-3.5 text-white" />
              )}
            </div>
            <span
              className={cn(
                'text-sm',
                step.status === 'complete' && 'text-green-500',
                step.status === 'active' && 'text-gold-500',
                step.status === 'pending' && 'text-verse-muted',
                step.status === 'error' && 'text-red-500'
              )}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="h-2 bg-verse-border rounded-full overflow-hidden">
          <div
            className="h-full bg-gold-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-verse-muted text-sm text-center">{message}</p>
      </div>
    </div>
  );
}

function LyricsPreview({
  lyrics,
  sections,
  detectedLanguages,
  onLyricsChange,
  title,
  artist,
  onTitleChange,
  onArtistChange,
  isEditing,
  onEditToggle,
}: {
  lyrics: string;
  sections: SongSection[];
  detectedLanguages: string[];
  onLyricsChange: (lyrics: string) => void;
  title: string;
  artist: string;
  onTitleChange: (title: string) => void;
  onArtistChange: (artist: string) => void;
  isEditing: boolean;
  onEditToggle: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Detected languages banner */}
      {detectedLanguages.length > 1 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gold-500/10 border border-gold-500/20 rounded-lg">
          <Languages className="w-4 h-4 text-gold-500" />
          <span className="text-gold-500 text-sm">
            Mixed languages detected: {detectedLanguages.join(' + ')}
          </span>
        </div>
      )}

      {/* Song metadata */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-verse-muted text-xs mb-1.5">
            Song Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Enter song title"
            className="w-full px-3 py-2 bg-verse-bg border border-verse-border rounded-lg text-verse-text placeholder-verse-muted text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
          />
        </div>
        <div>
          <label className="block text-verse-muted text-xs mb-1.5">
            Artist
          </label>
          <input
            type="text"
            value={artist}
            onChange={(e) => onArtistChange(e.target.value)}
            placeholder="Enter artist name"
            className="w-full px-3 py-2 bg-verse-bg border border-verse-border rounded-lg text-verse-text placeholder-verse-muted text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
          />
        </div>
      </div>

      {/* Lyrics editor */}
      <div className="border border-verse-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-verse-bg border-b border-verse-border">
          <span className="text-verse-text text-sm font-medium">Lyrics</span>
          <button
            onClick={onEditToggle}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors',
              isEditing
                ? 'bg-gold-500 text-verse-bg'
                : 'text-verse-muted hover:text-verse-text hover:bg-verse-border'
            )}
          >
            <Edit3 className="w-3 h-3" />
            {isEditing ? 'Editing' : 'Edit'}
          </button>
        </div>

        {isEditing ? (
          <textarea
            value={lyrics}
            onChange={(e) => onLyricsChange(e.target.value)}
            className="w-full h-64 px-4 py-3 bg-verse-card text-verse-text text-sm resize-none focus:outline-none font-mono"
            placeholder="Transcribed lyrics will appear here..."
          />
        ) : (
          <div className="h-64 overflow-y-auto px-4 py-3 bg-verse-card">
            {sections.length > 0 ? (
              <div className="space-y-4">
                {sections.map((section, idx) => (
                  <div key={idx}>
                    <span className="text-gold-500 text-xs font-medium uppercase tracking-wide">
                      [{section.label}]
                    </span>
                    <p className="text-verse-text text-sm whitespace-pre-wrap mt-1">
                      {section.lyrics}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-verse-text text-sm whitespace-pre-wrap">
                {lyrics || 'No lyrics transcribed yet.'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Warning for mixed languages */}
      {detectedLanguages.length > 1 && (
        <p className="text-verse-muted text-xs flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          Mixed languages detected — please verify spelling of non-English words
        </p>
      )}
    </div>
  );
}

function SuccessState({
  title,
  artist,
  onAddToSetlist,
  onClose,
}: {
  title: string;
  artist: string;
  onAddToSetlist: () => void;
  onClose: () => void;
}) {
  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
        <Check className="w-8 h-8 text-green-500" />
      </div>
      <h3 className="text-verse-text text-lg font-semibold mb-1">
        Song Imported Successfully!
      </h3>
      <p className="text-verse-muted text-sm mb-6">
        "{title}" by {artist || 'Unknown Artist'} has been added to your library.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-verse-muted hover:text-verse-text transition-colors"
        >
          Close
        </button>
        <button
          onClick={onAddToSetlist}
          className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-verse-bg rounded-lg font-medium hover:bg-gold-400 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add to Setlist
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function YouTubeImportModal({
  isOpen,
  onClose,
  onImportComplete,
  organizationId,
}: YouTubeImportModalProps) {
  // organizationId is passed as prop
  const [state, setState] = useState<ImportState>(INITIAL_STATE);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [importedSong, setImportedSong] = useState<Song | null>(null);

  const [processingSteps, setProcessingSteps] = useState<ProgressStep[]>([
    { id: 'download', label: 'Downloading audio', status: 'pending' },
    { id: 'transcribe', label: 'Transcribing lyrics', status: 'pending' },
    { id: 'format', label: 'Formatting sections', status: 'pending' },
  ]);

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setState(INITIAL_STATE);
    setIsDragging(false);
    setIsEditing(false);
    setImportedSong(null);
    setProcessingSteps([
      { id: 'download', label: 'Downloading audio', status: 'pending' },
      { id: 'transcribe', label: 'Transcribing lyrics', status: 'pending' },
      { id: 'format', label: 'Formatting sections', status: 'pending' },
    ]);
    onClose();
  }, [onClose]);

  // Update state helper
  const updateState = useCallback((updates: Partial<ImportState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Update processing step
  const updateStep = useCallback(
    (stepId: string, status: ProgressStep['status']) => {
      setProcessingSteps((prev) =>
        prev.map((s) => (s.id === stepId ? { ...s, status } : s))
      );
    },
    []
  );

  // File drag handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      updateState({ file: droppedFile, error: null });
    }
  }, [updateState]);

  // Validate input before processing
  const canProcess = useCallback(() => {
    if (state.sourceType === 'youtube') {
      return isValidYouTubeUrl(state.url);
    }
    return state.file !== null;
  }, [state.sourceType, state.url, state.file]);

  // Main processing function
  const handleProcess = useCallback(async () => {
    if (!canProcess()) {
      updateState({
        error:
          state.sourceType === 'youtube'
            ? 'Please enter a valid YouTube URL'
            : 'Please select a file to upload',
      });
      return;
    }

    updateState({ step: 'processing', error: null, progress: 0 });

    try {
      // Step 1: Download/extract audio
      updateStep('download', 'active');
      updateState({ progress: 10, progressMessage: 'Extracting audio...' });

      let audioBlob: Blob;

      if (state.sourceType === 'youtube') {
        // Call YouTube download API
        const downloadResponse = await fetch('/api/import/youtube', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: state.url,
            startTime: state.useTimeRange
              ? parseTimeToSeconds(state.startTime)
              : undefined,
            endTime: state.useTimeRange
              ? parseTimeToSeconds(state.endTime)
              : undefined,
          }),
        });

        if (!downloadResponse.ok) {
          const error = await downloadResponse.json();
          throw new Error(error.message || 'Failed to download audio');
        }

        audioBlob = await downloadResponse.blob();
      } else {
        // Use uploaded file directly
        audioBlob = state.file!;
      }

      updateStep('download', 'complete');
      updateState({ progress: 30, progressMessage: 'Audio extracted!' });

      // Step 2: Transcribe
      updateStep('transcribe', 'active');
      updateState({ progress: 40, progressMessage: 'Transcribing lyrics...' });

      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('language', state.language);
      if (state.title) formData.append('title', state.title);
      if (state.artist) formData.append('artist', state.artist);

      const transcribeResponse = await fetch('/api/import/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!transcribeResponse.ok) {
        const error = await transcribeResponse.json();
        throw new Error(error.message || 'Transcription failed');
      }

      const transcribeResult = await transcribeResponse.json();

      updateStep('transcribe', 'complete');
      updateState({
        progress: 70,
        progressMessage: 'Lyrics transcribed!',
        transcribedLyrics: transcribeResult.text,
        detectedLanguage: transcribeResult.language,
        detectedLanguages: transcribeResult.detectedLanguages || [
          transcribeResult.language,
        ],
      });

      // Step 3: Format sections
      updateStep('format', 'active');
      updateState({ progress: 80, progressMessage: 'Formatting sections...' });

      const formatResponse = await fetch('/api/import/format-lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lyrics: transcribeResult.text,
          title: state.title,
          artist: state.artist,
        }),
      });

      if (!formatResponse.ok) {
        // Non-critical error - we can still use raw lyrics
        console.warn('Section formatting failed, using raw lyrics');
        updateStep('format', 'complete');
        updateState({
          step: 'preview',
          progress: 100,
          progressMessage: 'Complete!',
          title: state.title || transcribeResult.suggestedTitle || '',
          artist: state.artist || transcribeResult.suggestedArtist || '',
        });
        return;
      }

      const formatResult = await formatResponse.json();

      updateStep('format', 'complete');
      updateState({
        step: 'preview',
        progress: 100,
        progressMessage: 'Complete!',
        formattedSections: formatResult.sections,
        title:
          state.title ||
          formatResult.suggestedTitle ||
          transcribeResult.suggestedTitle ||
          '',
        artist:
          state.artist ||
          formatResult.suggestedArtist ||
          transcribeResult.suggestedArtist ||
          '',
      });
    } catch (error) {
      console.error('Import failed:', error);
      updateState({
        step: 'input',
        error:
          error instanceof Error ? error.message : 'Import failed. Please try again.',
        progress: 0,
      });

      // Mark current step as error
      setProcessingSteps((prev) =>
        prev.map((s) => (s.status === 'active' ? { ...s, status: 'error' } : s))
      );
    }
  }, [canProcess, state, updateState, updateStep]);

  // Save song to library
  const handleSave = useCallback(async () => {
    if (!state.title.trim()) {
      updateState({ error: 'Please enter a song title' });
      return;
    }

    try {
      const songData = {
        title: state.title.trim(),
        artist: state.artist.trim() || 'Unknown Artist',
        lyrics: state.transcribedLyrics,
        sections: state.formattedSections,
        source: 'custom' as const,
        organizationId,
        tags: state.detectedLanguages,
      };

      const response = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(songData),
      });

      if (!response.ok) {
        throw new Error('Failed to save song');
      }

      const savedSong = await response.json();
      setImportedSong(savedSong);
      updateState({ step: 'complete' });

      if (onImportComplete) {
        onImportComplete(savedSong);
      }
    } catch (error) {
      console.error('Save failed:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Failed to save song',
      });
    }
  }, [state, organizationId, updateState, onImportComplete]);

  // Add to setlist handler
  const handleAddToSetlist = useCallback(() => {
    // This would trigger adding to setlist - implement based on your setlist logic
    handleClose();
  }, [handleClose]);

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-verse-card border border-verse-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-verse-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gold-500/20 flex items-center justify-center">
              {state.sourceType === 'youtube' ? (
                <Youtube className="w-4 h-4 text-gold-500" />
              ) : (
                <Upload className="w-4 h-4 text-gold-500" />
              )}
            </div>
            <h2 className="text-lg font-semibold text-verse-text">
              Import from {state.sourceType === 'youtube' ? 'YouTube' : 'File'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-verse-border rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-verse-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Input Step */}
          {state.step === 'input' && (
            <div className="space-y-6">
              {/* Source selector */}
              <SourceSelector
                sourceType={state.sourceType}
                onChange={(type) => updateState({ sourceType: type, error: null })}
              />

              {/* YouTube URL input */}
              {state.sourceType === 'youtube' && (
                <div>
                  <label className="block text-verse-muted text-sm mb-2">
                    YouTube URL
                  </label>
                  <input
                    type="url"
                    value={state.url}
                    onChange={(e) => updateState({ url: e.target.value, error: null })}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full px-4 py-3 bg-verse-bg border border-verse-border rounded-xl text-verse-text placeholder-verse-muted focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500"
                  />
                </div>
              )}

              {/* File upload */}
              {state.sourceType === 'file' && (
                <FileDropZone
                  file={state.file}
                  onFileSelect={(file) => updateState({ file, error: null })}
                  onFileClear={() => updateState({ file: null })}
                  isDragging={isDragging}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                />
              )}

              {/* Song details (optional) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-verse-muted text-sm mb-2">
                    Title <span className="text-verse-muted/50">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={state.title}
                    onChange={(e) => updateState({ title: e.target.value })}
                    placeholder="Auto-detect from transcription"
                    className="w-full px-4 py-3 bg-verse-bg border border-verse-border rounded-xl text-verse-text placeholder-verse-muted focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  />
                </div>
                <div>
                  <label className="block text-verse-muted text-sm mb-2">
                    Artist <span className="text-verse-muted/50">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={state.artist}
                    onChange={(e) => updateState({ artist: e.target.value })}
                    placeholder="Auto-detect from transcription"
                    className="w-full px-4 py-3 bg-verse-bg border border-verse-border rounded-xl text-verse-text placeholder-verse-muted focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  />
                </div>
              </div>

              {/* Language selector */}
              <div>
                <label className="block text-verse-muted text-sm mb-2">
                  Language
                </label>
                <LanguageSelector
                  value={state.language}
                  onChange={(lang) => updateState({ language: lang })}
                />
              </div>

              {/* Time range (for YouTube or longer files) */}
              {(state.sourceType === 'youtube' ||
                (state.file && state.file.size > 10 * 1024 * 1024)) && (
                <TimeRangeInput
                  enabled={state.useTimeRange}
                  onToggle={(enabled) => updateState({ useTimeRange: enabled })}
                  startTime={state.startTime}
                  endTime={state.endTime}
                  onStartChange={(time) => updateState({ startTime: time })}
                  onEndChange={(time) => updateState({ endTime: time })}
                />
              )}

              {/* Error message */}
              {state.error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {state.error}
                </div>
              )}
            </div>
          )}

          {/* Processing Step */}
          {state.step === 'processing' && (
            <div className="py-8">
              <ProcessingProgress
                steps={processingSteps}
                progress={state.progress}
                message={state.progressMessage}
              />
            </div>
          )}

          {/* Preview Step */}
          {state.step === 'preview' && (
            <LyricsPreview
              lyrics={state.transcribedLyrics}
              sections={state.formattedSections}
              detectedLanguages={state.detectedLanguages}
              onLyricsChange={(lyrics) => updateState({ transcribedLyrics: lyrics })}
              title={state.title}
              artist={state.artist}
              onTitleChange={(title) => updateState({ title })}
              onArtistChange={(artist) => updateState({ artist })}
              isEditing={isEditing}
              onEditToggle={() => setIsEditing(!isEditing)}
            />
          )}

          {/* Complete Step */}
          {state.step === 'complete' && (
            <SuccessState
              title={state.title}
              artist={state.artist}
              onAddToSetlist={handleAddToSetlist}
              onClose={handleClose}
            />
          )}
        </div>

        {/* Footer */}
        {state.step !== 'complete' && (
          <div className="p-4 border-t border-verse-border flex justify-between items-center">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-verse-muted hover:text-verse-text transition-colors"
            >
              Cancel
            </button>

            <div className="flex items-center gap-3">
              {state.step === 'preview' && (
                <button
                  onClick={() => updateState({ step: 'input' })}
                  className="px-4 py-2 border border-verse-border text-verse-muted hover:text-verse-text rounded-lg transition-colors"
                >
                  Back
                </button>
              )}

              {state.step === 'input' && (
                <button
                  onClick={handleProcess}
                  disabled={!canProcess()}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors',
                    canProcess()
                      ? 'bg-gold-500 text-verse-bg hover:bg-gold-400'
                      : 'bg-verse-border text-verse-muted cursor-not-allowed'
                  )}
                >
                  Extract & Transcribe
                </button>
              )}

              {state.step === 'preview' && (
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gold-500 text-verse-bg rounded-lg font-medium hover:bg-gold-400 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save to Library
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default YouTubeImportModal;
