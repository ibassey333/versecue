// ============================================
// Smart Scripture Search
// Unified search: references, text, and AI
// ============================================

import { ScriptureReference } from '@/types';
import {
  parseFlexibleReference,
  getBookSuggestions,
  looksLikeReference,
  BIBLE_BOOKS,
  ParsedReference,
} from './flexibleParser';
import { searchKJVText, looksLikeVerseText, TextSearchResult } from './textSearch';

export type SearchResultType = 'book' | 'reference' | 'text' | 'ai' | 'recent';

export interface SearchResult {
  type: SearchResultType;
  reference: ScriptureReference | null;
  book?: typeof BIBLE_BOOKS[0];
  text: string;
  preview?: string;
  confidence: number;
}

export interface SearchState {
  mode: 'idle' | 'book' | 'chapter' | 'verse' | 'text' | 'searching';
  selectedBook: typeof BIBLE_BOOKS[0] | null;
  chapter: number | null;
  results: SearchResult[];
}

// Recent searches storage
const RECENT_STORAGE_KEY = 'versecue_recent_searches';
const MAX_RECENT = 10;

export function getRecentSearches(): ScriptureReference[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(RECENT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(ref: ScriptureReference): void {
  if (typeof window === 'undefined') return;
  
  try {
    const recent = getRecentSearches();
    
    // Remove if already exists
    const filtered = recent.filter(r => r.reference !== ref.reference);
    
    // Add to front
    filtered.unshift(ref);
    
    // Trim to max
    const trimmed = filtered.slice(0, MAX_RECENT);
    
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore storage errors
  }
}

export function clearRecentSearches(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(RECENT_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Main search function - orchestrates all layers
 */
export async function smartSearch(
  query: string,
  options: {
    aiEnabled?: boolean;
    includeRecent?: boolean;
  } = {}
): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    // Return recent searches if enabled
    if (options.includeRecent) {
      return getRecentSearches().slice(0, 5).map(ref => ({
        type: 'recent' as SearchResultType,
        reference: ref,
        text: ref.reference,
        confidence: 1,
      }));
    }
    return [];
  }
  
  const results: SearchResult[] = [];
  
  // Layer 1: Check for book suggestions (autocomplete)
  const bookSuggestions = getBookSuggestions(trimmed);
  if (bookSuggestions.length > 0 && !trimmed.includes(' ') && !/\d/.test(trimmed)) {
    // Just typing a book name
    for (const book of bookSuggestions) {
      results.push({
        type: 'book',
        reference: null,
        book,
        text: book.name,
        preview: `${book.chapters} chapters`,
        confidence: 1,
      });
    }
    return results;
  }
  
  // Layer 2: Try flexible reference parsing
  if (looksLikeReference(trimmed)) {
    const parsed = parseFlexibleReference(trimmed);
    if (parsed) {
      results.push({
        type: 'reference',
        reference: {
          book: parsed.book,
          chapter: parsed.chapter,
          verseStart: parsed.verseStart,
          verseEnd: parsed.verseEnd,
          reference: parsed.reference,
        },
        text: parsed.reference,
        confidence: 1,
      });
      
      // Also suggest chapter if only chapter was given
      if (parsed.verseStart === null) {
        // Suggest first few verses
        for (let v = 1; v <= 3; v++) {
          results.push({
            type: 'reference',
            reference: {
              book: parsed.book,
              chapter: parsed.chapter,
              verseStart: v,
              verseEnd: null,
              reference: `${parsed.book} ${parsed.chapter}:${v}`,
            },
            text: `${parsed.book} ${parsed.chapter}:${v}`,
            confidence: 0.9,
          });
        }
      }
      
      return results;
    }
  }
  
  // Layer 3: Text search in KJV
  if (looksLikeVerseText(trimmed) || trimmed.length >= 10) {
    const textResults = await searchKJVText(trimmed, 5);
    
    for (const tr of textResults) {
      results.push({
        type: 'text',
        reference: tr.reference,
        text: tr.reference.reference,
        preview: truncateText(tr.text, 80),
        confidence: tr.score,
      });
    }
    
    if (results.length > 0) {
      return results;
    }
  }
  
  // Layer 4: AI Search (paid only)
  if (options.aiEnabled && results.length === 0) {
    // TODO: Implement AI search with Groq
    // For now, return empty - this will be added for paid tiers
  }
  
  // No results
  return results;
}

/**
 * Get suggestions as user types (debounced in UI)
 */
export async function getSuggestions(
  query: string,
  selectedBook: typeof BIBLE_BOOKS[0] | null = null
): Promise<SearchResult[]> {
  const trimmed = query.trim();
  
  // If book is selected, suggest chapters/verses
  if (selectedBook) {
    const numMatch = trimmed.match(/^(\d+)(?::(\d+))?$/);
    if (numMatch) {
      const chapter = parseInt(numMatch[1], 10);
      const verse = numMatch[2] ? parseInt(numMatch[2], 10) : null;
      
      if (chapter >= 1 && chapter <= selectedBook.chapters) {
        const results: SearchResult[] = [];
        
        if (verse !== null) {
          // Specific verse
          results.push({
            type: 'reference',
            reference: {
              book: selectedBook.name,
              chapter,
              verseStart: verse,
              verseEnd: null,
              reference: `${selectedBook.name} ${chapter}:${verse}`,
            },
            text: `${selectedBook.name} ${chapter}:${verse}`,
            confidence: 1,
          });
        } else {
          // Chapter, suggest with first verse
          results.push({
            type: 'reference',
            reference: {
              book: selectedBook.name,
              chapter,
              verseStart: 1,
              verseEnd: null,
              reference: `${selectedBook.name} ${chapter}:1`,
            },
            text: `${selectedBook.name} ${chapter}`,
            preview: 'Press Tab for verse',
            confidence: 1,
          });
        }
        
        return results;
      }
    }
    
    // No valid number yet, show chapter suggestions
    const results: SearchResult[] = [];
    for (let c = 1; c <= Math.min(5, selectedBook.chapters); c++) {
      results.push({
        type: 'reference',
        reference: {
          book: selectedBook.name,
          chapter: c,
          verseStart: null,
          verseEnd: null,
          reference: `${selectedBook.name} ${c}`,
        },
        text: `${selectedBook.name} ${c}`,
        preview: 'Chapter',
        confidence: 0.8,
      });
    }
    return results;
  }
  
  // Regular search
  return smartSearch(trimmed, { includeRecent: true });
}

/**
 * Truncate text for preview
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Format reference for display
 */
export function formatReference(ref: ScriptureReference): string {
  let str = `${ref.book} ${ref.chapter}`;
  if (ref.verseStart !== null) {
    str += `:${ref.verseStart}`;
    if (ref.verseEnd !== null) {
      str += `-${ref.verseEnd}`;
    }
  }
  return str;
}
