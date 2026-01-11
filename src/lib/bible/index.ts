// ============================================
// Bible Provider v2.2
// ============================================

import { BibleVerse, ScriptureReference } from '@/types';
import { getVerseLocal } from './providers/local-kjv';
import { fetchFromApiBible } from './providers/api-bible';
import { TRANSLATIONS } from '@/config/translations';

const verseCache = new Map<string, BibleVerse>();

export async function fetchVerse(
  reference: ScriptureReference, 
  translation: string = 'KJV'
): Promise<BibleVerse | null> {
  const cacheKey = `${translation}:${reference.reference}`;
  
  if (verseCache.has(cacheKey)) {
    console.log('[VerseCue Bible] Cache hit:', cacheKey);
    return verseCache.get(cacheKey)!;
  }

  const config = TRANSLATIONS[translation];
  
  if (!config || !config.enabled) {
    console.log('[VerseCue Bible] Unknown/disabled translation:', translation, '- using KJV');
    return fetchVerse(reference, 'KJV');
  }

  console.log('[VerseCue Bible] Fetching:', reference.reference, 'in', translation);

  let verse: BibleVerse | null = null;

  try {
    if (config.source === 'local') {
      verse = await getVerseLocal(reference);
    } else if (config.source === 'api-bible' && config.apiId) {
      verse = await fetchFromApiBible(reference, config.apiId, translation);
      
      // Fallback to KJV
      if (!verse && translation !== 'KJV') {
        console.log('[VerseCue Bible] API failed, fallback to KJV');
        verse = await getVerseLocal(reference);
        if (verse) verse.translation = 'KJV (fallback)';
      }
    }

    if (verse) {
      verseCache.set(cacheKey, verse);
    }

    return verse;
  } catch (error) {
    console.error('[VerseCue Bible] Error:', error);
    return translation !== 'KJV' ? fetchVerse(reference, 'KJV') : null;
  }
}

export { getVerseLocal } from './providers/local-kjv';
