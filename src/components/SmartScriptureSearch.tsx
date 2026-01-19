// ============================================
// Smart Scripture Search Component
// Premium autocomplete with reference + text search
// ============================================

'use client';

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { Search, Book, Clock, Sparkles, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScriptureReference } from '@/types';
import {
  smartSearch,
  getSuggestions,
  addRecentSearch,
  getRecentSearches,
  clearRecentSearches,
  SearchResult,
  BIBLE_BOOKS,
} from '@/lib/search';

interface SmartScriptureSearchProps {
  onSelect: (ref: ScriptureReference, matchedText: string) => Promise<void>;
  aiEnabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function SmartScriptureSearch({
  onSelect,
  aiEnabled = false,
  placeholder = 'Search scripture...',
  className,
}: SmartScriptureSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedBook, setSelectedBook] = useState<typeof BIBLE_BOOKS[0] | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Search with debounce
  const performSearch = useCallback(async (searchQuery: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    if (!searchQuery.trim()) {
      // Show recent searches
      const recent = getRecentSearches().slice(0, 5);
      setResults(recent.map(ref => ({
        type: 'recent' as const,
        reference: ref,
        text: ref.reference,
        confidence: 1,
      })));
      setSelectedIndex(0);
      return;
    }
    
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const searchResults = selectedBook
          ? await getSuggestions(searchQuery, selectedBook)
          : await smartSearch(searchQuery, { aiEnabled, includeRecent: true });
        
        setResults(searchResults);
        setSelectedIndex(0);
        setError(null);
      } catch (err) {
        console.error('[SmartSearch] Error:', err);
        setError('Search failed');
      } finally {
        setIsLoading(false);
      }
    }, 150); // 150ms debounce
  }, [selectedBook, aiEnabled]);
  
  // Trigger search on query change
  useEffect(() => {
    if (isOpen) {
      performSearch(query);
    }
  }, [query, isOpen, performSearch]);
  
  // Handle selection
  const handleSelect = async (result: SearchResult) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (result.type === 'book' && result.book) {
        // Book selected - enter chapter mode
        setSelectedBook(result.book);
        setQuery('');
        setResults([]);
        inputRef.current?.focus();
        return;
      }
      
      if (result.reference) {
        // Reference selected - add to queue
        addRecentSearch(result.reference);
        await onSelect(result.reference, result.text);
        
        // Reset state
        setQuery('');
        setSelectedBook(null);
        setIsOpen(false);
        setResults([]);
      }
    } catch (err) {
      setError('Failed to add verse');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        performSearch(query);
      }
      return;
    }
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
        
      case 'Tab':
        e.preventDefault();
        if (results[selectedIndex]) {
          const result = results[selectedIndex];
          if (result.type === 'book' && result.book) {
            // Select book
            setSelectedBook(result.book);
            setQuery('');
          } else if (result.reference && result.reference.verseStart === null) {
            // Chapter selected, add colon for verse entry
            setQuery(`${result.reference.chapter}:`);
          }
        }
        break;
        
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        if (selectedBook) {
          // Go back to book search
          setSelectedBook(null);
          setQuery('');
        } else {
          setIsOpen(false);
        }
        break;
        
      case 'Backspace':
        if (query === '' && selectedBook) {
          // Clear selected book
          setSelectedBook(null);
        }
        break;
    }
  };
  
  // Get icon for result type
  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'book':
        return <Book className="w-4 h-4" />;
      case 'recent':
        return <Clock className="w-4 h-4" />;
      case 'text':
        return <Search className="w-4 h-4" />;
      case 'ai':
        return <Sparkles className="w-4 h-4" />;
      default:
        return <ChevronRight className="w-4 h-4" />;
    }
  };
  
  // Get section label
  const getSectionLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'book':
        return 'Books';
      case 'recent':
        return 'Recent';
      case 'text':
        return 'Verse Text Matches';
      case 'ai':
        return 'AI Suggestions';
      case 'reference':
        return 'References';
      default:
        return '';
    }
  };
  
  // Group results by type
  const groupedResults = results.reduce((acc, result, index) => {
    const type = result.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push({ ...result, originalIndex: index });
    return acc;
  }, {} as Record<string, (SearchResult & { originalIndex: number })[]>);
  
  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          <Search className="w-4 h-4 text-verse-muted" />
        </div>
        
        {/* Selected book badge */}
        {selectedBook && (
          <div className="absolute inset-y-0 left-10 flex items-center">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gold-500/20 text-gold-400 text-xs font-medium">
              {selectedBook.name}
              <button
                onClick={() => {
                  setSelectedBook(null);
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="hover:text-gold-300"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          </div>
        )}
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedBook ? `Chapter:Verse (e.g., 3:16)` : placeholder}
          className={cn(
            'w-full py-3 rounded-xl bg-verse-bg border border-verse-border',
            'text-verse-text placeholder:text-verse-muted text-sm',
            'focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500/50',
            'transition-all duration-200',
            selectedBook ? 'pl-32 pr-4' : 'pl-10 pr-4'
          )}
        />
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-y-0 right-4 flex items-center">
            <div className="w-4 h-4 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
          </div>
        )}
      </div>
      
      {/* Dropdown */}
      {isOpen && (results.length > 0 || query === '') && (
        <div className="absolute z-50 w-full mt-2 py-2 rounded-xl bg-verse-surface border border-verse-border shadow-xl shadow-black/20 max-h-[400px] overflow-y-auto">
          {/* Error */}
          {error && (
            <div className="px-4 py-2 text-sm text-red-400">
              {error}
            </div>
          )}
          
          {/* Empty state with hints */}
          {results.length === 0 && query === '' && (
            <div className="px-4 py-3 text-sm text-verse-muted">
              <p className="font-medium text-verse-text mb-2">Quick tips:</p>
              <ul className="space-y-1 text-xs">
                <li>• Type book name: <span className="text-gold-400">ps</span> → Psalms</li>
                <li>• Type reference: <span className="text-gold-400">john 3:16</span> or <span className="text-gold-400">jn 3 16</span></li>
                <li>• Search text: <span className="text-gold-400">for god so loved</span></li>
              </ul>
            </div>
          )}
          
          {/* Results grouped by type */}
          {Object.entries(groupedResults).map(([type, items]) => (
            <div key={type}>
              {/* Section header */}
              <div className="px-4 py-1.5 text-[10px] font-semibold text-verse-subtle uppercase tracking-wider">
                {getSectionLabel(type as SearchResult['type'])}
              </div>
              
              {/* Items */}
              {items.map((result) => (
                <button
                  key={result.originalIndex}
                  onClick={() => handleSelect(result)}
                  className={cn(
                    'w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors',
                    result.originalIndex === selectedIndex
                      ? 'bg-gold-500/10 text-verse-text'
                      : 'text-verse-muted hover:bg-verse-border/50 hover:text-verse-text'
                  )}
                >
                  <span className={cn(
                    'flex-shrink-0',
                    result.originalIndex === selectedIndex ? 'text-gold-400' : 'text-verse-subtle'
                  )}>
                    {getIcon(result.type)}
                  </span>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {result.text}
                      </span>
                      {result.type === 'ai' && (
                        <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-400">
                          AI
                        </span>
                      )}
                    </div>
                    {result.preview && (
                      <p className="text-xs text-verse-subtle truncate mt-0.5">
                        {result.preview}
                      </p>
                    )}
                  </div>
                  
                  {/* Tab hint for books */}
                  {result.type === 'book' && (
                    <span className="flex-shrink-0 text-[10px] text-verse-subtle">
                      Tab →
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
          
          {/* Recent searches clear button */}
          {groupedResults['recent'] && groupedResults['recent'].length > 0 && (
            <div className="px-4 pt-2 pb-1 border-t border-verse-border mt-2">
              <button
                onClick={() => {
                  clearRecentSearches();
                  setResults([]);
                }}
                className="text-[10px] text-verse-subtle hover:text-verse-muted transition-colors"
              >
                Clear recent searches
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Keyboard hint */}
      <p className="mt-2 text-[10px] text-verse-muted flex items-center gap-2">
        <kbd className="px-1.5 py-0.5 rounded bg-verse-border font-mono text-[9px]">/</kbd>
        <span>to focus</span>
        <kbd className="px-1.5 py-0.5 rounded bg-verse-border font-mono text-[9px]">Tab</kbd>
        <span>to select book</span>
        <kbd className="px-1.5 py-0.5 rounded bg-verse-border font-mono text-[9px]">↵</kbd>
        <span>to add</span>
      </p>
    </div>
  );
}
