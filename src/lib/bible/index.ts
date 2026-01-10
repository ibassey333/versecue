// ============================================
// Bible Verse Fetching
// Unified interface with caching and provider selection
// ============================================

import { BibleVerse, ScriptureReference } from '@/types';
import { fetchPublicDomainVerse, getEmbeddedVerse } from './providers/public-domain';
import { fetchApiBibleVerse, isApiBibleEnabled } from './providers/api-bible';

// In-memory cache for verses
const verseCache = new Map<string, { verse: BibleVerse; fetchedAt: number }>();

/**
 * Generate cache key for a reference
 */
function getCacheKey(reference: ScriptureReference, translation: string): string {
  return `${reference.reference}:${translation}`;
}

/**
 * Check if cached verse is still valid
 */
function isCacheValid(fetchedAt: number): boolean {
  const cacheDays = parseInt(process.env.VERSE_CACHE_DAYS || '7', 10);
  const maxAge = cacheDays * 24 * 60 * 60 * 1000;
  return Date.now() - fetchedAt < maxAge;
}

/**
 * Get verse from cache
 */
function getCachedVerse(reference: ScriptureReference, translation: string): BibleVerse | null {
  const key = getCacheKey(reference, translation);
  const cached = verseCache.get(key);
  
  if (cached && isCacheValid(cached.fetchedAt)) {
    return cached.verse;
  }
  
  // Clear expired cache
  if (cached) {
    verseCache.delete(key);
  }
  
  return null;
}

/**
 * Cache a verse
 */
function cacheVerse(verse: BibleVerse): void {
  const key = getCacheKey(
    { 
      book: verse.book, 
      chapter: verse.chapter, 
      verseStart: verse.verseStart, 
      verseEnd: verse.verseEnd || null,
      reference: verse.reference,
    },
    verse.translation
  );
  
  verseCache.set(key, { verse, fetchedAt: Date.now() });
  
  // Limit cache size
  if (verseCache.size > 1000) {
    // Remove oldest entries
    const entries = Array.from(verseCache.entries());
    entries.sort((a, b) => a[1].fetchedAt - b[1].fetchedAt);
    for (let i = 0; i < 100; i++) {
      verseCache.delete(entries[i][0]);
    }
  }
}

/**
 * Fetch a verse with automatic provider selection and caching
 * 
 * Priority:
 * 1. Memory cache
 * 2. API.Bible (if enabled)
 * 3. Public domain API
 * 4. Embedded verses (offline fallback)
 */
export async function fetchVerse(
  reference: ScriptureReference,
  preferredTranslation?: string
): Promise<BibleVerse | null> {
  const translation = preferredTranslation || process.env.DEFAULT_TRANSLATION || 'KJV';
  
  // Check cache first
  const cached = getCachedVerse(reference, translation);
  if (cached) {
    return cached;
  }
  
  let verse: BibleVerse | null = null;
  
  // Try API.Bible first if enabled
  if (isApiBibleEnabled()) {
    verse = await fetchApiBibleVerse(reference, translation);
    if (verse) {
      cacheVerse(verse);
      return verse;
    }
  }
  
  // Fall back to public domain API
  const publicTranslation = translation.toLowerCase() === 'web' ? 'web' : 'kjv';
  verse = await fetchPublicDomainVerse(reference, publicTranslation);
  
  if (verse) {
    cacheVerse(verse);
    return verse;
  }
  
  // Last resort: embedded verses
  verse = getEmbeddedVerse(reference);
  if (verse) {
    return verse;
  }
  
  return null;
}

/**
 * Prefetch multiple verses (for performance)
 */
export async function prefetchVerses(
  references: ScriptureReference[],
  translation?: string
): Promise<Map<string, BibleVerse>> {
  const results = new Map<string, BibleVerse>();
  
  await Promise.all(
    references.map(async (ref) => {
      const verse = await fetchVerse(ref, translation);
      if (verse) {
        results.set(ref.reference, verse);
      }
    })
  );
  
  return results;
}

/**
 * Clear verse cache
 */
export function clearVerseCache(): void {
  verseCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  oldestEntry: number | null;
} {
  let oldest: number | null = null;
  
  const values = Array.from(verseCache.values());
  for (const { fetchedAt } of values) {
    if (oldest === null || fetchedAt < oldest) {
      oldest = fetchedAt;
    }
  }
  
  return {
    size: verseCache.size,
    oldestEntry: oldest,
  };
}

// Re-export provider functions
export { isApiBibleEnabled } from './providers/api-bible';
export { getEmbeddedVerse } from './providers/public-domain';
