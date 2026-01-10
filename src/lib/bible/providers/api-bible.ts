// ============================================
// API.Bible Provider
// Commercial provider with multiple translations
// Toggle via ENABLE_API_BIBLE environment variable
// ============================================

import { BibleVerse, ScriptureReference } from '@/types';

const API_BIBLE_BASE = 'https://api.scripture.api.bible/v1';

// Bible IDs for common translations (from API.Bible)
export const BIBLE_IDS: Record<string, string> = {
  'KJV': 'de4e12af7f28f599-02',
  'ASV': '06125adad2d5898a-01',
  'WEB': '9879dbb7cfe39e4d-04',
  'ESV': '9879dbb7cfe39e4d-01', // Note: ESV may require additional licensing
};

// Book ID mapping for API.Bible
const BOOK_IDS: Record<string, string> = {
  'Genesis': 'GEN', 'Exodus': 'EXO', 'Leviticus': 'LEV', 'Numbers': 'NUM',
  'Deuteronomy': 'DEU', 'Joshua': 'JOS', 'Judges': 'JDG', 'Ruth': 'RUT',
  '1 Samuel': '1SA', '2 Samuel': '2SA', '1 Kings': '1KI', '2 Kings': '2KI',
  '1 Chronicles': '1CH', '2 Chronicles': '2CH', 'Ezra': 'EZR', 'Nehemiah': 'NEH',
  'Esther': 'EST', 'Job': 'JOB', 'Psalms': 'PSA', 'Proverbs': 'PRO',
  'Ecclesiastes': 'ECC', 'Song of Solomon': 'SNG', 'Isaiah': 'ISA', 'Jeremiah': 'JER',
  'Lamentations': 'LAM', 'Ezekiel': 'EZK', 'Daniel': 'DAN', 'Hosea': 'HOS',
  'Joel': 'JOL', 'Amos': 'AMO', 'Obadiah': 'OBA', 'Jonah': 'JON',
  'Micah': 'MIC', 'Nahum': 'NAM', 'Habakkuk': 'HAB', 'Zephaniah': 'ZEP',
  'Haggai': 'HAG', 'Zechariah': 'ZEC', 'Malachi': 'MAL',
  'Matthew': 'MAT', 'Mark': 'MRK', 'Luke': 'LUK', 'John': 'JHN',
  'Acts': 'ACT', 'Romans': 'ROM', '1 Corinthians': '1CO', '2 Corinthians': '2CO',
  'Galatians': 'GAL', 'Ephesians': 'EPH', 'Philippians': 'PHP', 'Colossians': 'COL',
  '1 Thessalonians': '1TH', '2 Thessalonians': '2TH', '1 Timothy': '1TI', '2 Timothy': '2TI',
  'Titus': 'TIT', 'Philemon': 'PHM', 'Hebrews': 'HEB', 'James': 'JAS',
  '1 Peter': '1PE', '2 Peter': '2PE', '1 John': '1JN', '2 John': '2JN',
  '3 John': '3JN', 'Jude': 'JUD', 'Revelation': 'REV',
};

/**
 * Check if API.Bible is enabled
 */
export function isApiBibleEnabled(): boolean {
  return process.env.ENABLE_API_BIBLE === 'true' && !!process.env.API_BIBLE_KEY;
}

/**
 * Build passage ID for API.Bible
 */
function buildPassageId(reference: ScriptureReference): string | null {
  const bookId = BOOK_IDS[reference.book];
  if (!bookId) return null;
  
  // Format: BOOK.CHAPTER.VERSE or BOOK.CHAPTER.VERSE-BOOK.CHAPTER.VERSE
  if (reference.verseStart) {
    if (reference.verseEnd && reference.verseEnd !== reference.verseStart) {
      return `${bookId}.${reference.chapter}.${reference.verseStart}-${bookId}.${reference.chapter}.${reference.verseEnd}`;
    }
    return `${bookId}.${reference.chapter}.${reference.verseStart}`;
  }
  
  // Whole chapter
  return `${bookId}.${reference.chapter}`;
}

/**
 * Strip HTML tags from verse text
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .trim();
}

/**
 * Fetch verse from API.Bible
 */
export async function fetchApiBibleVerse(
  reference: ScriptureReference,
  translationKey: string = 'KJV'
): Promise<BibleVerse | null> {
  // Check if enabled
  if (!isApiBibleEnabled()) {
    console.log('API.Bible is not enabled');
    return null;
  }
  
  const apiKey = process.env.API_BIBLE_KEY;
  if (!apiKey) {
    console.error('API.Bible key not configured');
    return null;
  }
  
  const bibleId = BIBLE_IDS[translationKey] || BIBLE_IDS['KJV'];
  const passageId = buildPassageId(reference);
  
  if (!passageId) {
    console.error(`Could not build passage ID for ${reference.reference}`);
    return null;
  }
  
  try {
    const url = `${API_BIBLE_BASE}/bibles/${bibleId}/passages/${passageId}?content-type=text&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=false`;
    
    const response = await fetch(url, {
      headers: {
        'api-key': apiKey,
        'Accept': 'application/json',
      },
      next: { 
        revalidate: 60 * 60 * 24 * 7, // Cache for 7 days (API.Bible compliance)
      },
    });
    
    if (!response.ok) {
      console.error(`API.Bible error: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.data?.content) {
      console.error('API.Bible returned no content');
      return null;
    }
    
    const text = stripHtml(data.data.content);
    
    return {
      reference: reference.reference,
      text,
      translation: translationKey,
      book: reference.book,
      chapter: reference.chapter,
      verseStart: reference.verseStart || 1,
      verseEnd: reference.verseEnd || undefined,
      cachedAt: new Date(),
    };
  } catch (error) {
    console.error('API.Bible fetch error:', error);
    return null;
  }
}

/**
 * Get available translations from API.Bible
 */
export async function getAvailableTranslations(): Promise<Array<{
  id: string;
  name: string;
  abbreviation: string;
}> | null> {
  if (!isApiBibleEnabled()) {
    return null;
  }
  
  const apiKey = process.env.API_BIBLE_KEY;
  if (!apiKey) {
    return null;
  }
  
  try {
    const response = await fetch(`${API_BIBLE_BASE}/bibles?language=eng`, {
      headers: {
        'api-key': apiKey,
        'Accept': 'application/json',
      },
      next: { revalidate: 86400 }, // Cache for 24 hours
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    return data.data?.map((bible: { id: string; name: string; abbreviation: string }) => ({
      id: bible.id,
      name: bible.name,
      abbreviation: bible.abbreviation,
    })) || [];
  } catch {
    return null;
  }
}
