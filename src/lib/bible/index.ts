// ============================================
// Bible Provider - Hybrid Local + API
// ============================================

import { BibleVerse, ScriptureReference } from '@/types';
import { getVerseLocal, getNextVerse, getPrevVerse, isKJVLoaded } from './providers/local-kjv';

export async function fetchVerse(
  reference: ScriptureReference,
  translation: string = 'KJV'
): Promise<BibleVerse | null> {
  // Try local KJV first (instant)
  if (translation.toUpperCase() === 'KJV') {
    const local = await getVerseLocal(reference);
    if (local) return local;
  }
  
  // Fallback - return null (API removed for simplicity)
  console.warn('Verse not found locally:', reference.reference);
  return null;
}

export { getNextVerse, getPrevVerse, isKJVLoaded };
