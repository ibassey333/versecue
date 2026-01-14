// ============================================
// Local KJV Bible Provider
// Instant lookup from local JSON file
// ============================================

import { BibleVerse, ScriptureReference } from '@/types';

let kjvData: Record<string, Record<string, Record<string, string>>> | null = null;
let loadPromise: Promise<void> | null = null;

// Book name normalization for KJV data lookup
const KJV_BOOK_NAMES: Record<string, string> = {
  'Genesis': 'Genesis', 'Exodus': 'Exodus', 'Leviticus': 'Leviticus',
  'Numbers': 'Numbers', 'Deuteronomy': 'Deuteronomy', 'Joshua': 'Joshua',
  'Judges': 'Judges', 'Ruth': 'Ruth', '1 Samuel': '1 Samuel', '2 Samuel': '2 Samuel',
  '1 Kings': '1 Kings', '2 Kings': '2 Kings', '1 Chronicles': '1 Chronicles',
  '2 Chronicles': '2 Chronicles', 'Ezra': 'Ezra', 'Nehemiah': 'Nehemiah',
  'Esther': 'Esther', 'Job': 'Job', 'Psalms': 'Psalms', 'Psalm': 'Psalms',
  'Proverbs': 'Proverbs', 'Ecclesiastes': 'Ecclesiastes',
  'Song of Solomon': 'Song of Solomon', 'Isaiah': 'Isaiah', 'Jeremiah': 'Jeremiah',
  'Lamentations': 'Lamentations', 'Ezekiel': 'Ezekiel', 'Daniel': 'Daniel',
  'Hosea': 'Hosea', 'Joel': 'Joel', 'Amos': 'Amos', 'Obadiah': 'Obadiah',
  'Jonah': 'Jonah', 'Micah': 'Micah', 'Nahum': 'Nahum', 'Habakkuk': 'Habakkuk',
  'Zephaniah': 'Zephaniah', 'Haggai': 'Haggai', 'Zechariah': 'Zechariah',
  'Malachi': 'Malachi', 'Matthew': 'Matthew', 'Mark': 'Mark', 'Luke': 'Luke',
  'John': 'John', 'Acts': 'Acts', 'Romans': 'Romans',
  '1 Corinthians': '1 Corinthians', '2 Corinthians': '2 Corinthians',
  'Galatians': 'Galatians', 'Ephesians': 'Ephesians', 'Philippians': 'Philippians',
  'Colossians': 'Colossians', '1 Thessalonians': '1 Thessalonians',
  '2 Thessalonians': '2 Thessalonians', '1 Timothy': '1 Timothy',
  '2 Timothy': '2 Timothy', 'Titus': 'Titus', 'Philemon': 'Philemon',
  'Hebrews': 'Hebrews', 'James': 'James', '1 Peter': '1 Peter', '2 Peter': '2 Peter',
  '1 John': '1 John', '2 John': '2 John', '3 John': '3 John', 'Jude': 'Jude',
  'Revelation': 'Revelation',
};

function normalizeBookName(book: string): string {
  return KJV_BOOK_NAMES[book] || book;
}

async function loadKJV(): Promise<void> {
  if (kjvData) return;
  if (loadPromise) return loadPromise;
  
  loadPromise = (async () => {
    try {
      const response = await fetch('/bibles/kjv.json');
      if (!response.ok) {
        throw new Error(`Failed to load KJV: ${response.status}`);
      }
      kjvData = await response.json();
      console.log('[VerseCue] KJV Bible loaded');
    } catch (error) {
      console.error('[VerseCue] Failed to load KJV:', error);
      kjvData = null;
    }
  })();
  
  return loadPromise;
}

/**
 * Get verse from local KJV JSON
 */
export async function getVerseLocal(reference: ScriptureReference): Promise<BibleVerse | null> {
  await loadKJV();
  
  if (!kjvData) {
    console.warn('[VerseCue] KJV data not available');
    return null;
  }
  
  const book = normalizeBookName(reference.book);
  if (!book) {
    console.warn('[VerseCue] Unknown book:', reference.book);
    return null;
  }
  
  const bookData = kjvData[book];
  if (!bookData) {
    console.warn('[VerseCue] Book not found:', book);
    return null;
  }
  
  const chapterData = bookData[String(reference.chapter)];
  if (!chapterData) {
    console.warn('[VerseCue] Chapter not found:', reference.chapter);
    return null;
  }
  
  // Get verses
  const startVerse = reference.verseStart || 1;
  const endVerse = reference.verseEnd || startVerse;
  
  const verses: string[] = [];
  for (let v = startVerse; v <= endVerse; v++) {
    const verseText = chapterData[String(v)];
    if (verseText) {
      verses.push(verseText);
    }
  }
  
  if (verses.length === 0) {
    console.warn('[VerseCue] Verse not found:', startVerse);
    return null;
  }
  
  return {
    reference: reference.reference,
    text: verses.join(' ').replace(/\{[^}]*\}/g, '').replace(/\s+/g, ' ').trim(),
    translation: 'KJV',
    book: reference.book,
    chapter: reference.chapter,
    verseStart: startVerse,
    verseEnd: endVerse > startVerse ? endVerse : null,
  };
}
