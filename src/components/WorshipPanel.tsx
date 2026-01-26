"use client";

import { useState, useCallback, useEffect } from 'react';
import { 
  Music, Search, Mic, Play, SkipForward, SkipBack, 
  Plus, List, Loader2, ChevronDown, ChevronUp, X, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/stores/session';
import { useWorshipDisplaySync } from '@/hooks/useWorshipDisplaySync';
import { Song, SongMatch } from '@/types';

// ============================================
// Song Search Component
// ============================================
function SongSearch({ onSelect }: { onSelect: (song: Song) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SongMatch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchSongs = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(
        `https://lrclib.net/api/search?q=${encodeURIComponent(searchQuery)}`
      );
      
      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      
      const matches: SongMatch[] = data.slice(0, 8).map((item: any) => ({
        song: {
          id: `lrclib_${item.id}`,
          title: item.trackName || item.name,
          artist: item.artistName,
          album: item.albumName,
          lyrics: item.plainLyrics || '',
          source: 'lrclib' as const,
          sourceId: String(item.id),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        confidence: 1,
        source: 'lrclib' as const,
      }));

      setResults(matches);
    } catch (err) {
      console.error('Song search error:', err);
      setError('Search failed. Try again.');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.length >= 2) {
        searchSongs(query);
      } else {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [query, searchSongs]);

  return (
    <div className="flex flex-col rounded-xl border border-verse-border bg-verse-surface">
      <div className="px-5 py-4 border-b border-verse-border">
        <h3 className="font-body text-sm font-semibold text-verse-text tracking-wide uppercase">
          Find Songs
        </h3>
      </div>
      
      <div className="p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-verse-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or artist..."
            className="w-full pl-10 pr-4 py-3 bg-verse-bg border border-verse-border rounded-xl text-verse-text placeholder-verse-muted text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-500 animate-spin" />
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {results.length > 0 && (
          <div className="max-h-[250px] overflow-y-auto space-y-1">
            {results.map((match) => (
              <button
                key={match.song.id}
                onClick={() => {
                  onSelect(match.song);
                  setQuery('');
                  setResults([]);
                }}
                className="w-full flex items-center gap-3 p-3 bg-verse-bg hover:bg-verse-border/50 border border-transparent hover:border-gold-500/30 rounded-lg text-left transition-all group"
              >
                <div className="w-9 h-9 bg-gold-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Music className="w-4 h-4 text-gold-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-verse-text truncate">{match.song.title}</p>
                  <p className="text-xs text-verse-muted truncate">{match.song.artist}</p>
                </div>
                <Plus className="w-4 h-4 text-verse-muted group-hover:text-gold-400 transition-colors" />
              </button>
            ))}
          </div>
        )}

        {query.length >= 2 && results.length === 0 && !isSearching && !error && (
          <p className="text-sm text-verse-muted text-center py-4">No songs found</p>
        )}
        
        {query.length < 2 && results.length === 0 && (
          <p className="text-xs text-verse-muted text-center py-2">
            Type at least 2 characters to search
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================
// Setlist Queue Component
// ============================================
function SetlistQueue() {
  const [isExpanded, setIsExpanded] = useState(true);
  const worship = useSessionStore((s) => s.worship);
  const setCurrentSong = useSessionStore((s) => s.setCurrentSong);
  const removeFromSetlist = useSessionStore((s) => s.removeFromSetlist);

  const queue = worship.setlistQueue;
  const currentSong = worship.currentSong;

  return (
    <div className="rounded-xl border border-verse-border bg-verse-surface overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-verse-bg/50 transition-colors border-b border-verse-border"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-2.5 h-2.5 rounded-full',
            queue.length > 0 ? 'bg-gold-500' : 'bg-verse-muted'
          )} />
          <h3 className="font-body text-sm font-semibold text-verse-text tracking-wide uppercase">
            Setlist
          </h3>
          {queue.length > 0 && (
            <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold text-verse-bg bg-gold-500 rounded-full">
              {queue.length}
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-verse-muted" /> : <ChevronDown className="w-4 h-4 text-verse-muted" />}
      </button>

      {isExpanded && (
        <div className="p-4">
          {queue.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-3 opacity-50">🎵</div>
              <p className="text-sm text-verse-muted">
                No songs in setlist
              </p>
              <p className="text-xs text-verse-subtle mt-1">
                Search above to add songs
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {queue.map((item, index) => (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border transition-all',
                    currentSong?.id === item.song?.id
                      ? 'bg-gold-500/10 border-gold-500/50'
                      : 'bg-verse-bg border-verse-border hover:border-verse-muted'
                  )}
                >
                  <span className="text-xs text-verse-muted font-medium w-5">{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-verse-text truncate">
                      {item.song?.title || 'Unknown'}
                    </p>
                    <p className="text-xs text-verse-muted truncate">
                      {item.song?.artist || 'Unknown'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentSong(item.song)}
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        currentSong?.id === item.song?.id
                          ? 'text-gold-400 bg-gold-500/20'
                          : 'text-verse-muted hover:text-verse-text hover:bg-verse-border'
                      )}
                      title="Display"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeFromSetlist(item.song?.id || '')}
                      className="p-2 rounded-lg text-verse-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Ready to Display (Song Sections)
// ============================================
function ReadyToDisplay() {
  const worship = useSessionStore((s) => s.worship);
  const goToSection = useSessionStore((s) => s.goToSection);
  const setCurrentSong = useSessionStore((s) => s.setCurrentSong);

  const song = worship.currentSong;
  const currentIndex = worship.currentSectionIndex;

  if (!song) {
    return (
      <div className="flex flex-col rounded-xl border border-verse-border bg-verse-surface h-full">
        <div className="px-5 py-4 border-b border-verse-border">
          <h3 className="font-body text-sm font-semibold text-verse-text tracking-wide uppercase">
            Ready to Display
          </h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="text-5xl mb-4 opacity-40">📋</div>
          <p className="text-verse-muted text-sm">Song sections appear here</p>
          <p className="text-verse-subtle text-xs mt-1">Search and select a song to get started</p>
        </div>
      </div>
    );
  }

  // Split lyrics into sections
  const sections = song.lyrics.split(/\n\n+/).filter(Boolean);

  return (
    <div className="flex flex-col rounded-xl border border-verse-border bg-verse-surface h-full">
      <div className="px-5 py-4 border-b border-verse-border flex items-center justify-between">
        <div>
          <h3 className="font-body text-sm font-semibold text-verse-text tracking-wide uppercase">
            Ready to Display
          </h3>
          <p className="text-xs text-verse-muted mt-0.5">{song.title} - {song.artist}</p>
        </div>
        <button
          onClick={() => setCurrentSong(null)}
          className="p-2 rounded-lg text-verse-muted hover:text-verse-text hover:bg-verse-border transition-colors"
          title="Clear"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {sections.map((section: string, index: number) => {
          const isActive = index === currentIndex;
          const firstLine = section.split('\n')[0].substring(0, 40);
          
          return (
            <button
              key={index}
              onClick={() => goToSection(index)}
              className={cn(
                'w-full text-left p-4 rounded-lg border transition-all',
                isActive
                  ? 'bg-gold-500/10 border-gold-500 shadow-lg shadow-gold-500/10'
                  : 'bg-verse-bg border-verse-border hover:border-gold-500/30 hover:bg-verse-elevated'
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn(
                  'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold',
                  isActive ? 'bg-gold-500 text-verse-bg' : 'bg-verse-border text-verse-muted'
                )}>
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium truncate',
                    isActive ? 'text-gold-400' : 'text-verse-text'
                  )}>
                    {firstLine}{firstLine.length >= 40 ? '...' : ''}
                  </p>
                  <p className="text-xs text-verse-muted">
                    {section.split('\n').length} lines
                  </p>
                </div>
                {isActive && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-gold-500 text-verse-bg font-medium">
                    LIVE
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      
      <div className="px-5 py-3 border-t border-verse-border bg-verse-bg/50">
        <span className="text-xs text-verse-subtle">{sections.length} sections</span>
      </div>
    </div>
  );
}

// ============================================
// Lyrics Preview (Like LIVE PREVIEW)
// ============================================
function LyricsPreview({ orgSlug }: { orgSlug?: string }) {
  const worship = useSessionStore((s) => s.worship);
  const nextSection = useSessionStore((s) => s.nextSection);
  const prevSection = useSessionStore((s) => s.prevSection);

  const song = worship.currentSong;
  const sectionIndex = worship.currentSectionIndex;

  // Split lyrics into sections
  const sections = song ? song.lyrics.split(/\n\n+/).filter(Boolean) : [];
  const currentSection = sections[sectionIndex] || '';
  const totalSections = sections.length;

  return (
    <div className="rounded-xl border border-verse-border bg-verse-surface overflow-hidden">
      <div className="px-5 py-4 border-b border-verse-border flex items-center justify-between">
        <h3 className="font-body text-sm font-semibold text-verse-text tracking-wide uppercase">
          Live Preview
        </h3>
        {orgSlug && (
          <a
            href={`/display/${orgSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-verse-muted hover:text-gold-400 transition-colors"
          >
            Open Display <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
      
      {/* Preview Area */}
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
        {song ? (
          <div className="text-center px-8 py-6 max-h-full overflow-hidden">
            <h2 className="text-gold-400 font-bold text-lg mb-4">{song.title}</h2>
            <pre className="text-white text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {currentSection}
            </pre>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-12 h-12 bg-verse-border/50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Music className="w-6 h-6 text-verse-muted" />
            </div>
            <p className="text-verse-muted text-sm">No song displayed</p>
          </div>
        )}
      </div>
      
      {/* Navigation */}
      {song && (
        <div className="px-5 py-3 border-t border-verse-border bg-verse-bg/50 flex items-center justify-between">
          <button
            onClick={prevSection}
            disabled={sectionIndex === 0}
            className="flex items-center gap-2 px-3 py-2 text-sm text-verse-muted hover:text-verse-text disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-verse-border transition-colors"
          >
            <SkipBack className="w-4 h-4" />
            <span className="hidden sm:inline">Prev</span>
          </button>
          
          <span className="text-sm font-medium text-verse-text">
            {sectionIndex + 1} <span className="text-verse-muted">/ {totalSections}</span>
          </span>
          
          <button
            onClick={nextSection}
            disabled={sectionIndex >= totalSections - 1}
            className="flex items-center gap-2 px-3 py-2 text-sm text-verse-muted hover:text-verse-text disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-verse-border transition-colors"
          >
            <span className="hidden sm:inline">Next</span>
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// Worship Stats
// ============================================
function WorshipStats() {
  const worship = useSessionStore((s) => s.worship);
  
  const songsInQueue = worship.setlistQueue.length;
  const currentSong = worship.currentSong;
  const sections = currentSong ? currentSong.lyrics.split(/\n\n+/).filter(Boolean).length : 0;
  
  return (
    <div className="rounded-xl border border-verse-border bg-verse-surface p-5">
      <h3 className="font-body text-xs font-semibold text-verse-subtle tracking-wide uppercase mb-4">
        Worship Stats
      </h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gold-400">{songsInQueue}</p>
          <p className="text-[10px] text-verse-muted uppercase tracking-wide">In Queue</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-400">{currentSong ? 1 : 0}</p>
          <p className="text-[10px] text-verse-muted uppercase tracking-wide">Displayed</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-verse-text">{sections}</p>
          <p className="text-[10px] text-verse-muted uppercase tracking-wide">Sections</p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Detection Panel
// ============================================
function DetectionPanel() {
  const worship = useSessionStore((s) => s.worship);
  const setDetecting = useSessionStore((s) => s.setDetecting);

  return (
    <div className="rounded-xl border border-verse-border bg-verse-surface overflow-hidden">
      <div className="px-5 py-4 border-b border-verse-border">
        <h3 className="font-body text-sm font-semibold text-verse-text tracking-wide uppercase">
          Song Detection
        </h3>
      </div>
      
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center transition-all',
            worship.isDetecting 
              ? 'bg-gold-500 animate-pulse shadow-lg shadow-gold-500/30' 
              : 'bg-verse-border'
          )}>
            <Mic className={cn('w-5 h-5', worship.isDetecting ? 'text-verse-bg' : 'text-verse-muted')} />
          </div>
          <div>
            <p className="text-sm font-medium text-verse-text">
              {worship.isDetecting ? 'Listening...' : 'Ready to detect'}
            </p>
            <p className="text-xs text-verse-muted">
              Identify songs automatically
            </p>
          </div>
        </div>

        <button
          onClick={() => setDetecting(!worship.isDetecting)}
          className={cn(
            'w-full py-3 rounded-xl font-semibold transition-all',
            worship.isDetecting
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-gold-500 text-verse-bg hover:bg-gold-400 shadow-lg shadow-gold-500/20'
          )}
        >
          {worship.isDetecting ? 'Stop Detecting' : 'Detect Song'}
        </button>

        <p className="text-[10px] text-verse-subtle text-center mt-3">
          🎵 AI detection coming in next update
        </p>
      </div>
    </div>
  );
}

// ============================================
// Main WorshipPanel Component
// ============================================
export function WorshipPanel({ orgSlug }: { orgSlug?: string }) {
  const addToSetlist = useSessionStore((s) => s.addToSetlist);
  const setCurrentSong = useSessionStore((s) => s.setCurrentSong);
  
  // Sync worship display to projector
  useWorshipDisplaySync(orgSlug);

  const handleSongSelect = (song: Song) => {
    addToSetlist(song);
    setCurrentSong(song);
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left Column: Search + Setlist + Detection */}
      <div className="col-span-12 lg:col-span-4 space-y-4">
        <SongSearch onSelect={handleSongSelect} />
        <SetlistQueue />
        <DetectionPanel />
      </div>

      {/* Middle Column: Ready to Display */}
      <div className="col-span-12 lg:col-span-4">
        <ReadyToDisplay />
      </div>

      {/* Right Column: Preview + Stats */}
      <div className="col-span-12 lg:col-span-4 space-y-4">
        <LyricsPreview orgSlug={orgSlug} />
        <WorshipStats />
      </div>
    </div>
  );
}
