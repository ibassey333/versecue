// ============================================
// Local KJV Text Search
// Searches verse content without API calls
// ============================================

import { ScriptureReference } from '@/types';

export interface TextSearchResult {
  reference: ScriptureReference;
  text: string;
  score: number;
  matchedTerms: string[];
}

// In-memory search index (lazy loaded)
let searchIndex: Map<string, Set<string>> | null = null;
let verseTexts: Map<string, string> | null = null;

/**
 * Build search index from KJV data
 * Called once on first search
 */
async function buildSearchIndex(): Promise<void> {
  if (searchIndex !== null) return;
  
  // Load KJV JSON from public folder
  let kjvData: Record<string, Record<string, Record<string, string>>>;
  
  try {
    const response = await fetch('/kjv.json');
    if (response.ok) {
      kjvData = await response.json();
    } else {
      console.warn('[TextSearch] Could not load kjv.json, text search disabled');
      searchIndex = new Map();
      verseTexts = new Map();
      return;
    }
  } catch (error) {
    console.warn('[TextSearch] Error loading KJV data:', error);
    searchIndex = new Map();
    verseTexts = new Map();
    return;
  }
  
  searchIndex = new Map();
  verseTexts = new Map();
  
  // Iterate through nested structure: Book -> Chapter -> Verse -> Text
  for (const [book, chapters] of Object.entries(kjvData)) {
    for (const [chapter, verses] of Object.entries(chapters)) {
      for (const [verse, text] of Object.entries(verses)) {
        const ref = `${book} ${chapter}:${verse}`;
        const textStr = text as string;
        verseTexts.set(ref, textStr);
        
        // Tokenize and index
        const words = textStr.toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter((w: string) => w.length > 2);
        
        for (const word of words) {
          if (!searchIndex.has(word)) {
            searchIndex.set(word, new Set());
          }
          searchIndex.get(word)!.add(ref);
        }
      }
    }
  }
  
  console.log(`[TextSearch] Indexed ${verseTexts.size} verses`);
}

/**
 * Parse a reference key like "John 3:16" to ScriptureReference
 */
function parseRefKey(key: string): ScriptureReference | null {
  const match = key.match(/^(.+?)\s+(\d+):(\d+)$/);
  if (!match) return null;
  
  return {
    book: match[1],
    chapter: parseInt(match[2], 10),
    verseStart: parseInt(match[3], 10),
    verseEnd: null,
    reference: key,
  };
}

/**
 * Search KJV text for matching verses
 */
export async function searchKJVText(
  query: string,
  limit = 10
): Promise<TextSearchResult[]> {
  await buildSearchIndex();
  
  if (!searchIndex || !verseTexts || searchIndex.size === 0) {
    return [];
  }
  
  // Tokenize query
  const queryTerms = query.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w: string) => w.length > 2);
  
  if (queryTerms.length === 0) {
    return [];
  }
  
  // Find verses containing query terms
  const verseCounts = new Map<string, { count: number; terms: string[] }>();
  
  for (const term of queryTerms) {
    const matchingRefs = searchIndex.get(term);
    if (!matchingRefs) continue;
    
    for (const ref of matchingRefs) {
      const current = verseCounts.get(ref) || { count: 0, terms: [] };
      current.count++;
      current.terms.push(term);
      verseCounts.set(ref, current);
    }
  }
  
  // Filter to verses matching most terms
  const results: TextSearchResult[] = [];
  const minTerms = Math.max(1, Math.floor(queryTerms.length * 0.7));
  
  for (const [ref, { count, terms }] of verseCounts) {
    if (count >= minTerms) {
      const parsed = parseRefKey(ref);
      if (parsed) {
        results.push({
          reference: parsed,
          text: verseTexts.get(ref) || '',
          score: count / queryTerms.length,
          matchedTerms: terms,
        });
      }
    }
  }
  
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.reference.reference.localeCompare(b.reference.reference);
  });
  
  return results.slice(0, limit);
}

/**
 * Check if query looks like verse text (vs reference)
 */
export function looksLikeVerseText(query: string): boolean {
  const words = query.toLowerCase().split(/\s+/);
  
  if (words.length >= 3 && !/\d/.test(query)) {
    return true;
  }
  
  const textIndicators = [
    'the', 'and', 'for', 'that', 'shall', 'unto', 'lord', 'god',
    'thy', 'thee', 'thou', 'hath', 'with', 'which', 'from', 'have',
    'love', 'faith', 'grace', 'spirit', 'word', 'life', 'truth'
  ];
  
  const indicatorCount = words.filter((w: string) => textIndicators.includes(w)).length;
  return indicatorCount >= 2;
}

/**
 * Get quick suggestions as user types
 */
export async function getQuickSuggestions(
  query: string,
  limit = 5
): Promise<TextSearchResult[]> {
  if (query.length < 5 || query.split(/\s+/).length < 2) {
    return [];
  }
  return searchKJVText(query, limit);
}
