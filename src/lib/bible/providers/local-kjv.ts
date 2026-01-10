// ============================================
// Local KJV Bible Provider - Instant Lookup
// ============================================

import { BibleVerse, ScriptureReference } from '@/types';

let kjvBible: Record<string, Record<string, Record<string, string>>> | null = null;
let loadPromise: Promise<void> | null = null;

// Book name normalization
const BOOK_ALIASES: Record<string, string> = {
  'genesis': 'Genesis', 'gen': 'Genesis', 'ge': 'Genesis',
  'exodus': 'Exodus', 'exod': 'Exodus', 'ex': 'Exodus',
  'leviticus': 'Leviticus', 'lev': 'Leviticus',
  'numbers': 'Numbers', 'num': 'Numbers',
  'deuteronomy': 'Deuteronomy', 'deut': 'Deuteronomy', 'dt': 'Deuteronomy',
  'joshua': 'Joshua', 'josh': 'Joshua',
  'judges': 'Judges', 'judg': 'Judges',
  'ruth': 'Ruth',
  '1 samuel': '1 Samuel', '1samuel': '1 Samuel', '1 sam': '1 Samuel', '1sam': '1 Samuel',
  '2 samuel': '2 Samuel', '2samuel': '2 Samuel', '2 sam': '2 Samuel', '2sam': '2 Samuel',
  '1 kings': '1 Kings', '1kings': '1 Kings', '1 kgs': '1 Kings',
  '2 kings': '2 Kings', '2kings': '2 Kings', '2 kgs': '2 Kings',
  '1 chronicles': '1 Chronicles', '1chronicles': '1 Chronicles', '1 chr': '1 Chronicles',
  '2 chronicles': '2 Chronicles', '2chronicles': '2 Chronicles', '2 chr': '2 Chronicles',
  'ezra': 'Ezra',
  'nehemiah': 'Nehemiah', 'neh': 'Nehemiah',
  'esther': 'Esther', 'esth': 'Esther',
  'job': 'Job',
  'psalms': 'Psalms', 'psalm': 'Psalms', 'ps': 'Psalms', 'psa': 'Psalms',
  'proverbs': 'Proverbs', 'prov': 'Proverbs', 'pro': 'Proverbs',
  'ecclesiastes': 'Ecclesiastes', 'eccl': 'Ecclesiastes', 'ecc': 'Ecclesiastes',
  'song of solomon': 'Song of Solomon', 'song': 'Song of Solomon', 'sos': 'Song of Solomon',
  'isaiah': 'Isaiah', 'isa': 'Isaiah',
  'jeremiah': 'Jeremiah', 'jer': 'Jeremiah',
  'lamentations': 'Lamentations', 'lam': 'Lamentations',
  'ezekiel': 'Ezekiel', 'ezek': 'Ezekiel',
  'daniel': 'Daniel', 'dan': 'Daniel',
  'hosea': 'Hosea', 'hos': 'Hosea',
  'joel': 'Joel',
  'amos': 'Amos',
  'obadiah': 'Obadiah', 'obad': 'Obadiah',
  'jonah': 'Jonah',
  'micah': 'Micah', 'mic': 'Micah',
  'nahum': 'Nahum', 'nah': 'Nahum',
  'habakkuk': 'Habakkuk', 'hab': 'Habakkuk',
  'zephaniah': 'Zephaniah', 'zeph': 'Zephaniah',
  'haggai': 'Haggai', 'hag': 'Haggai',
  'zechariah': 'Zechariah', 'zech': 'Zechariah',
  'malachi': 'Malachi', 'mal': 'Malachi',
  'matthew': 'Matthew', 'matt': 'Matthew', 'mat': 'Matthew', 'mt': 'Matthew',
  'mark': 'Mark', 'mrk': 'Mark', 'mk': 'Mark',
  'luke': 'Luke', 'luk': 'Luke', 'lk': 'Luke',
  'john': 'John', 'joh': 'John', 'jn': 'John',
  'acts': 'Acts', 'act': 'Acts',
  'romans': 'Romans', 'rom': 'Romans', 'ro': 'Romans',
  '1 corinthians': '1 Corinthians', '1corinthians': '1 Corinthians', '1 cor': '1 Corinthians', '1cor': '1 Corinthians',
  '2 corinthians': '2 Corinthians', '2corinthians': '2 Corinthians', '2 cor': '2 Corinthians', '2cor': '2 Corinthians',
  'galatians': 'Galatians', 'gal': 'Galatians',
  'ephesians': 'Ephesians', 'eph': 'Ephesians',
  'philippians': 'Philippians', 'phil': 'Philippians', 'php': 'Philippians',
  'colossians': 'Colossians', 'col': 'Colossians',
  '1 thessalonians': '1 Thessalonians', '1thessalonians': '1 Thessalonians', '1 thess': '1 Thessalonians', '1thess': '1 Thessalonians',
  '2 thessalonians': '2 Thessalonians', '2thessalonians': '2 Thessalonians', '2 thess': '2 Thessalonians', '2thess': '2 Thessalonians',
  '1 timothy': '1 Timothy', '1timothy': '1 Timothy', '1 tim': '1 Timothy', '1tim': '1 Timothy',
  '2 timothy': '2 Timothy', '2timothy': '2 Timothy', '2 tim': '2 Timothy', '2tim': '2 Timothy',
  'titus': 'Titus', 'tit': 'Titus',
  'philemon': 'Philemon', 'philem': 'Philemon', 'phm': 'Philemon',
  'hebrews': 'Hebrews', 'heb': 'Hebrews',
  'james': 'James', 'jam': 'James', 'jas': 'James',
  '1 peter': '1 Peter', '1peter': '1 Peter', '1 pet': '1 Peter', '1pet': '1 Peter',
  '2 peter': '2 Peter', '2peter': '2 Peter', '2 pet': '2 Peter', '2pet': '2 Peter',
  '1 john': '1 John', '1john': '1 John', '1 jn': '1 John', '1jn': '1 John',
  '2 john': '2 John', '2john': '2 John', '2 jn': '2 John', '2jn': '2 John',
  '3 john': '3 John', '3john': '3 John', '3 jn': '3 John', '3jn': '3 John',
  'jude': 'Jude',
  'revelation': 'Revelation', 'rev': 'Revelation', 'revelations': 'Revelation',
};

function normalizeBookName(book: string): string {
  if (!book) return ""; const lower = book.toLowerCase().trim();
  return BOOK_ALIASES[lower] || book;
}

async function loadBible(): Promise<void> {
  if (kjvBible) return;
  
  if (loadPromise) {
    await loadPromise;
    return;
  }
  
  loadPromise = (async () => {
    try {
      const response = await fetch('/bibles/kjv.json');
      if (response.ok) {
        kjvBible = await response.json();
        console.log('[VerseCue] KJV Bible loaded');
      }
    } catch (e) {
      console.error('[VerseCue] Failed to load KJV:', e);
    }
  })();
  
  await loadPromise;
}

export async function getVerseLocal(reference: ScriptureReference): Promise<BibleVerse | null> {
  await loadBible();
  
  if (!kjvBible) return null;
  
  const bookName = normalizeBookName(reference.book);
  const book = kjvBible[bookName];
  if (!book) return null;
  
  const chapter = book[String(reference.chapter)];
  if (!chapter) return null;
  
  const verseStart = reference.verseStart || 1;
  const verseEnd = reference.verseEnd || verseStart;
  
  const verses: string[] = [];
  for (let v = verseStart; v <= verseEnd; v++) {
    const verse = chapter[String(v)];
    if (verse) {
      verses.push(verse);
    }
  }
  
  if (verses.length === 0) return null;
  
  return {
    reference: reference.reference,
    text: verses.join(' '),
    translation: 'KJV',
    book: bookName,
    chapter: reference.chapter,
    verseStart: verseStart,
    verseEnd: verseEnd > verseStart ? verseEnd : null,
  };
}

export async function getNextVerse(reference: ScriptureReference): Promise<ScriptureReference | null> {
  await loadBible();
  if (!kjvBible) return null;
  
  const bookName = normalizeBookName(reference.book);
  const book = kjvBible[bookName];
  if (!book) return null;
  
  const chapter = book[String(reference.chapter)];
  if (!chapter) return null;
  
  const currentVerse = reference.verseEnd || reference.verseStart || 1;
  const nextVerse = currentVerse + 1;
  
  if (chapter[String(nextVerse)]) {
    return {
      ...reference,
      verseStart: reference.verseStart,
      verseEnd: nextVerse,
      reference: `${bookName} ${reference.chapter}:${reference.verseStart}-${nextVerse}`,
    };
  }
  
  return null;
}

export async function getPrevVerse(reference: ScriptureReference): Promise<ScriptureReference | null> {
  if (!reference.verseEnd || reference.verseEnd <= (reference.verseStart || 1)) {
    return null;
  }
  
  const newEnd = reference.verseEnd - 1;
  
  if (newEnd === reference.verseStart) {
    return {
      ...reference,
      verseEnd: null,
      reference: `${reference.book} ${reference.chapter}:${reference.verseStart}`,
    };
  }
  
  return {
    ...reference,
    verseEnd: newEnd,
    reference: `${reference.book} ${reference.chapter}:${reference.verseStart}-${newEnd}`,
  };
}

export function isKJVLoaded(): boolean {
  return kjvBible !== null;
}
