// ============================================
// API.Bible Provider - FIXED ENDPOINT
// ============================================

import { BibleVerse, ScriptureReference } from '@/types';

// FIXED: Using correct endpoint from API.Bible dashboard
const API_BASE = 'https://rest.api.bible/v1';

const BOOK_IDS: Record<string, string> = {
  'Genesis': 'GEN', 'Exodus': 'EXO', 'Leviticus': 'LEV', 'Numbers': 'NUM',
  'Deuteronomy': 'DEU', 'Joshua': 'JOS', 'Judges': 'JDG', 'Ruth': 'RUT',
  '1 Samuel': '1SA', '2 Samuel': '2SA', '1 Kings': '1KI', '2 Kings': '2KI',
  '1 Chronicles': '1CH', '2 Chronicles': '2CH', 'Ezra': 'EZR', 'Nehemiah': 'NEH',
  'Esther': 'EST', 'Job': 'JOB', 'Psalms': 'PSA', 'Psalm': 'PSA',
  'Proverbs': 'PRO', 'Ecclesiastes': 'ECC', 'Song of Solomon': 'SNG',
  'Isaiah': 'ISA', 'Jeremiah': 'JER', 'Lamentations': 'LAM', 'Ezekiel': 'EZK',
  'Daniel': 'DAN', 'Hosea': 'HOS', 'Joel': 'JOL', 'Amos': 'AMO',
  'Obadiah': 'OBA', 'Jonah': 'JON', 'Micah': 'MIC', 'Nahum': 'NAM',
  'Habakkuk': 'HAB', 'Zephaniah': 'ZEP', 'Haggai': 'HAG', 'Zechariah': 'ZEC',
  'Malachi': 'MAL', 'Matthew': 'MAT', 'Mark': 'MRK', 'Luke': 'LUK',
  'John': 'JHN', 'Acts': 'ACT', 'Romans': 'ROM', '1 Corinthians': '1CO',
  '2 Corinthians': '2CO', 'Galatians': 'GAL', 'Ephesians': 'EPH',
  'Philippians': 'PHP', 'Colossians': 'COL', '1 Thessalonians': '1TH',
  '2 Thessalonians': '2TH', '1 Timothy': '1TI', '2 Timothy': '2TI',
  'Titus': 'TIT', 'Philemon': 'PHM', 'Hebrews': 'HEB', 'James': 'JAS',
  '1 Peter': '1PE', '2 Peter': '2PE', '1 John': '1JN', '2 John': '2JN',
  '3 John': '3JN', 'Jude': 'JUD', 'Revelation': 'REV',
};

export async function fetchFromApiBible(
  reference: ScriptureReference,
  bibleId: string,
  translationAbbr: string
): Promise<BibleVerse | null> {
  const apiKey = process.env.NEXT_PUBLIC_API_BIBLE_KEY;
  
  if (!apiKey) {
    console.warn('[VerseCue API.Bible] No API key');
    return null;
  }

  const bookId = BOOK_IDS[reference.book] || BOOK_IDS[reference.book.replace('Psalm', 'Psalms')];
  if (!bookId) {
    console.warn('[VerseCue API.Bible] Unknown book:', reference.book);
    return null;
  }

  let passageId = `${bookId}.${reference.chapter}`;
  if (reference.verseStart) {
    passageId += `.${reference.verseStart}`;
    if (reference.verseEnd && reference.verseEnd !== reference.verseStart) {
      passageId += `-${bookId}.${reference.chapter}.${reference.verseEnd}`;
    }
  }

  const url = `${API_BASE}/bibles/${bibleId}/passages/${passageId}?content-type=text&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=false`;
  
  console.log('[VerseCue API.Bible] Request:', { translationAbbr, passageId, url });
  console.log('[VerseCue API.Bible] API Key (first 10 chars):', apiKey.substring(0, 10) + '...');

  try {
    const response = await fetch(url, { 
      headers: { 'api-key': apiKey },
      cache: 'no-store'
    });

    console.log('[VerseCue API.Bible] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[VerseCue API.Bible] Error response:', errorText);
      return null;
    }

    const data = await response.json();
    const text = data.data?.content?.trim() || '';
    
    if (!text) {
      console.warn('[VerseCue API.Bible] Empty content');
      return null;
    }

    console.log('[VerseCue API.Bible] Success:', text.substring(0, 50) + '...');

    return {
      reference: reference.reference,
      text,
      translation: translationAbbr,
      book: reference.book,
      chapter: reference.chapter,
      verseStart: reference.verseStart || 1,
      verseEnd: reference.verseEnd,
      cachedAt: new Date(),
    };
  } catch (error) {
    console.error('[VerseCue API.Bible] Fetch error:', error);
    return null;
  }
}
