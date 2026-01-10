// ============================================
// Manual Search Component
// Quick search fallback for operators
// ============================================

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Loader2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/stores/session';
import { parseScriptures } from '@/lib/detection/parser';
import { fetchVerse } from '@/lib/bible';
import { BIBLE_BOOKS } from '@/lib/detection/books';
import { ScriptureReference } from '@/types';

interface ManualSearchProps {
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
}

interface SearchResult {
  reference: ScriptureReference;
  verseText?: string;
  translation?: string;
}

export function ManualSearch({ className, inputRef: externalRef }: ManualSearchProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = externalRef || internalRef;
  
  const { addDetection } = useSessionStore();
  
  // Generate book suggestions
  const bookSuggestions = BIBLE_BOOKS
    .filter(book => 
      book.name.toLowerCase().includes(query.toLowerCase()) ||
      book.aliases.some(a => a.includes(query.toLowerCase()))
    )
    .slice(0, 5);
  
  // Search for scriptures
  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    
    try {
      // Parse the query
      const parsed = parseScriptures(query);
      
      if (parsed.length > 0) {
        // Fetch verse text for each result
        const resultsWithText = await Promise.all(
          parsed.map(async (p) => {
            const verse = await fetchVerse(p.reference);
            return {
              reference: p.reference,
              verseText: verse?.text,
              translation: verse?.translation,
            };
          })
        );
        
        setResults(resultsWithText);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [query]);
  
  // Handle adding a result to queue
  const handleAdd = useCallback((result: SearchResult) => {
    addDetection({
      id: `manual_${Date.now()}`,
      reference: result.reference,
      matchedText: 'Manual search',
      confidence: 'high',
      confidenceScore: 1.0,
      detectionType: 'deterministic',
      detectedAt: new Date(),
      verseText: result.verseText,
      translation: result.translation,
    });
    
    setQuery('');
    setResults([]);
  }, [addDetection]);
  
  // Handle Enter key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && document.activeElement === inputRef.current) {
        e.preventDefault();
        handleSearch();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSearch, inputRef]);
  
  return (
    <div className={cn(
      'rounded-xl border border-verse-border bg-verse-surface p-4',
      className
    )}>
      {/* Search input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-verse-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Search scripture... (e.g., John 3:16)"
            className={cn(
              'w-full pl-12 pr-4 py-3 rounded-xl',
              'bg-verse-bg border border-verse-border',
              'text-verse-text placeholder:text-verse-muted',
              'font-body text-sm',
              'focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500',
              'transition-all duration-200'
            )}
          />
          {isLoading && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-500 animate-spin" />
          )}
        </div>
        
        {/* Book suggestions dropdown */}
        <AnimatePresence>
          {showSuggestions && query && bookSuggestions.length > 0 && !results.length && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                'absolute z-10 w-full mt-2 py-2',
                'bg-verse-elevated border border-verse-border rounded-xl shadow-xl'
              )}
            >
              {bookSuggestions.map((book) => (
                <button
                  key={book.name}
                  onClick={() => {
                    setQuery(book.name + ' ');
                    inputRef.current?.focus();
                  }}
                  className={cn(
                    'w-full px-4 py-2 text-left',
                    'text-verse-text text-sm hover:bg-verse-border/50',
                    'transition-colors'
                  )}
                >
                  <span className="font-medium">{book.name}</span>
                  <span className="text-verse-subtle ml-2 text-xs">
                    ({book.chapters} chapters)
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Results */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-3"
          >
            {results.map((result) => (
              <motion.div
                key={result.reference.reference}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  'flex items-start gap-4 p-4 rounded-xl',
                  'bg-verse-bg border border-verse-border',
                )}
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-display text-lg font-semibold text-gold-400">
                    {result.reference.reference}
                  </h4>
                  {result.verseText && (
                    <p className="text-sm text-verse-text/80 font-scripture italic mt-2 line-clamp-3">
                      "{result.verseText}"
                    </p>
                  )}
                  {result.translation && (
                    <span className="text-[10px] text-verse-muted mt-2 inline-block">
                      {result.translation}
                    </span>
                  )}
                </div>
                
                <button
                  onClick={() => handleAdd(result)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg',
                    'bg-confidence-high text-white font-medium text-sm',
                    'hover:bg-confidence-high/90 transition-colors',
                    'flex-shrink-0'
                  )}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Help text */}
      <p className="mt-3 text-[11px] text-verse-muted">
        Press <kbd className="px-1.5 py-0.5 rounded bg-verse-border font-mono text-[10px]">/</kbd> to focus • 
        <kbd className="px-1.5 py-0.5 rounded bg-verse-border font-mono text-[10px] ml-1">Enter</kbd> to search
      </p>
    </div>
  );
}
