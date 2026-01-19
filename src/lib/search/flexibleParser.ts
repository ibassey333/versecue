// ============================================
// Flexible Scripture Parser
// Handles: "John 3 : 16", "jn3:16", "ps 23 1", etc.
// ============================================

import { ScriptureReference } from '@/types';

// All 66 books with aliases and chapter counts
export const BIBLE_BOOKS = [
  // Old Testament
  { name: 'Genesis', aliases: ['gen', 'ge', 'gn'], chapters: 50 },
  { name: 'Exodus', aliases: ['ex', 'exod', 'exo'], chapters: 40 },
  { name: 'Leviticus', aliases: ['lev', 'le', 'lv'], chapters: 27 },
  { name: 'Numbers', aliases: ['num', 'nu', 'nm', 'nb'], chapters: 36 },
  { name: 'Deuteronomy', aliases: ['deut', 'de', 'dt'], chapters: 34 },
  { name: 'Joshua', aliases: ['josh', 'jos', 'jsh'], chapters: 24 },
  { name: 'Judges', aliases: ['judg', 'jdg', 'jg', 'jdgs'], chapters: 21 },
  { name: 'Ruth', aliases: ['ru', 'rth'], chapters: 4 },
  { name: '1 Samuel', aliases: ['1sam', '1sa', '1s', 'i sam', 'i samuel', 'first samuel'], chapters: 31 },
  { name: '2 Samuel', aliases: ['2sam', '2sa', '2s', 'ii sam', 'ii samuel', 'second samuel'], chapters: 24 },
  { name: '1 Kings', aliases: ['1kgs', '1ki', '1k', 'i kings', 'i ki', 'first kings'], chapters: 22 },
  { name: '2 Kings', aliases: ['2kgs', '2ki', '2k', 'ii kings', 'ii ki', 'second kings'], chapters: 25 },
  { name: '1 Chronicles', aliases: ['1chr', '1ch', 'i chronicles', 'i chr', 'first chronicles'], chapters: 29 },
  { name: '2 Chronicles', aliases: ['2chr', '2ch', 'ii chronicles', 'ii chr', 'second chronicles'], chapters: 36 },
  { name: 'Ezra', aliases: ['ezr', 'ez'], chapters: 10 },
  { name: 'Nehemiah', aliases: ['neh', 'ne'], chapters: 13 },
  { name: 'Esther', aliases: ['esth', 'est', 'es'], chapters: 10 },
  { name: 'Job', aliases: ['jb'], chapters: 42 },
  { name: 'Psalms', aliases: ['ps', 'psa', 'psalm', 'pslm', 'psm', 'pss'], chapters: 150 },
  { name: 'Proverbs', aliases: ['prov', 'pro', 'pr', 'prv'], chapters: 31 },
  { name: 'Ecclesiastes', aliases: ['eccl', 'ecc', 'ec', 'eccles'], chapters: 12 },
  { name: 'Song of Solomon', aliases: ['song', 'sos', 'so', 'songs', 'song of songs', 'canticles'], chapters: 8 },
  { name: 'Isaiah', aliases: ['isa', 'is'], chapters: 66 },
  { name: 'Jeremiah', aliases: ['jer', 'je', 'jr'], chapters: 52 },
  { name: 'Lamentations', aliases: ['lam', 'la'], chapters: 5 },
  { name: 'Ezekiel', aliases: ['ezek', 'eze', 'ezk'], chapters: 48 },
  { name: 'Daniel', aliases: ['dan', 'da', 'dn'], chapters: 12 },
  { name: 'Hosea', aliases: ['hos', 'ho'], chapters: 14 },
  { name: 'Joel', aliases: ['joe', 'jl'], chapters: 3 },
  { name: 'Amos', aliases: ['am'], chapters: 9 },
  { name: 'Obadiah', aliases: ['obad', 'ob'], chapters: 1 },
  { name: 'Jonah', aliases: ['jon', 'jnh'], chapters: 4 },
  { name: 'Micah', aliases: ['mic', 'mi'], chapters: 7 },
  { name: 'Nahum', aliases: ['nah', 'na'], chapters: 3 },
  { name: 'Habakkuk', aliases: ['hab', 'hb'], chapters: 3 },
  { name: 'Zephaniah', aliases: ['zeph', 'zep', 'zp'], chapters: 3 },
  { name: 'Haggai', aliases: ['hag', 'hg'], chapters: 2 },
  { name: 'Zechariah', aliases: ['zech', 'zec', 'zc'], chapters: 14 },
  { name: 'Malachi', aliases: ['mal', 'ml'], chapters: 4 },
  // New Testament
  { name: 'Matthew', aliases: ['matt', 'mat', 'mt'], chapters: 28 },
  { name: 'Mark', aliases: ['mk', 'mr', 'mrk'], chapters: 16 },
  { name: 'Luke', aliases: ['lk', 'lu', 'luk'], chapters: 24 },
  { name: 'John', aliases: ['jn', 'jhn', 'jo'], chapters: 21 },
  { name: 'Acts', aliases: ['ac', 'act'], chapters: 28 },
  { name: 'Romans', aliases: ['rom', 'ro', 'rm'], chapters: 16 },
  { name: '1 Corinthians', aliases: ['1cor', '1co', 'i corinthians', 'i cor', 'first corinthians'], chapters: 16 },
  { name: '2 Corinthians', aliases: ['2cor', '2co', 'ii corinthians', 'ii cor', 'second corinthians'], chapters: 13 },
  { name: 'Galatians', aliases: ['gal', 'ga'], chapters: 6 },
  { name: 'Ephesians', aliases: ['eph', 'ep', 'ephes'], chapters: 6 },
  { name: 'Philippians', aliases: ['phil', 'php', 'pp'], chapters: 4 },
  { name: 'Colossians', aliases: ['col', 'co'], chapters: 4 },
  { name: '1 Thessalonians', aliases: ['1thess', '1th', 'i thessalonians', 'i thess', 'first thessalonians'], chapters: 5 },
  { name: '2 Thessalonians', aliases: ['2thess', '2th', 'ii thessalonians', 'ii thess', 'second thessalonians'], chapters: 3 },
  { name: '1 Timothy', aliases: ['1tim', '1ti', 'i timothy', 'i tim', 'first timothy'], chapters: 6 },
  { name: '2 Timothy', aliases: ['2tim', '2ti', 'ii timothy', 'ii tim', 'second timothy'], chapters: 4 },
  { name: 'Titus', aliases: ['tit', 'ti'], chapters: 3 },
  { name: 'Philemon', aliases: ['philem', 'phm', 'pm'], chapters: 1 },
  { name: 'Hebrews', aliases: ['heb', 'he'], chapters: 13 },
  { name: 'James', aliases: ['jas', 'jm', 'jam'], chapters: 5 },
  { name: '1 Peter', aliases: ['1pet', '1pe', '1pt', 'i peter', 'i pet', 'first peter'], chapters: 5 },
  { name: '2 Peter', aliases: ['2pet', '2pe', '2pt', 'ii peter', 'ii pet', 'second peter'], chapters: 3 },
  { name: '1 John', aliases: ['1jn', '1jo', 'i john', 'i jn', 'first john'], chapters: 5 },
  { name: '2 John', aliases: ['2jn', '2jo', 'ii john', 'ii jn', 'second john'], chapters: 1 },
  { name: '3 John', aliases: ['3jn', '3jo', 'iii john', 'iii jn', 'third john'], chapters: 1 },
  { name: 'Jude', aliases: ['jud', 'jd'], chapters: 1 },
  { name: 'Revelation', aliases: ['rev', 're', 'revelations', 'apoc', 'apocalypse'], chapters: 22 },
];

// Build lookup maps for fast access
const bookByName = new Map<string, typeof BIBLE_BOOKS[0]>();
const bookByAlias = new Map<string, typeof BIBLE_BOOKS[0]>();

BIBLE_BOOKS.forEach(book => {
  bookByName.set(book.name.toLowerCase(), book);
  book.aliases.forEach(alias => {
    bookByAlias.set(alias.toLowerCase(), book);
  });
});

/**
 * Find a book by name or alias
 */
export function findBook(input: string): typeof BIBLE_BOOKS[0] | null {
  const lower = input.toLowerCase().trim();
  
  // Direct name match
  if (bookByName.has(lower)) {
    return bookByName.get(lower)!;
  }
  
  // Alias match
  if (bookByAlias.has(lower)) {
    return bookByAlias.get(lower)!;
  }
  
  // Handle numbered books without space: "1john" -> "1 john"
  const numberedMatch = lower.match(/^([123])\s*([a-z]+)$/);
  if (numberedMatch) {
    const withSpace = `${numberedMatch[1]} ${numberedMatch[2]}`;
    const withoutSpace = `${numberedMatch[1]}${numberedMatch[2]}`;
    
    if (bookByName.has(withSpace)) return bookByName.get(withSpace)!;
    if (bookByAlias.has(withSpace)) return bookByAlias.get(withSpace)!;
    if (bookByAlias.has(withoutSpace)) return bookByAlias.get(withoutSpace)!;
  }
  
  return null;
}

/**
 * Get book suggestions for autocomplete
 */
export function getBookSuggestions(partial: string, limit = 5): typeof BIBLE_BOOKS[0][] {
  if (!partial.trim()) return [];
  
  const lower = partial.toLowerCase().trim();
  const results: typeof BIBLE_BOOKS[0][] = [];
  const seen = new Set<string>();
  
  // First: exact prefix match on book name
  for (const book of BIBLE_BOOKS) {
    if (book.name.toLowerCase().startsWith(lower) && !seen.has(book.name)) {
      results.push(book);
      seen.add(book.name);
    }
  }
  
  // Second: prefix match on aliases
  for (const book of BIBLE_BOOKS) {
    if (seen.has(book.name)) continue;
    for (const alias of book.aliases) {
      if (alias.startsWith(lower)) {
        results.push(book);
        seen.add(book.name);
        break;
      }
    }
  }
  
  return results.slice(0, limit);
}

/**
 * Normalize input to handle various formats
 * "John 3 : 16" -> "john 3:16"
 * "jn3:16" -> "jn 3:16"
 * "ps 23 1" -> "ps 23:1"
 */
export function normalizeInput(input: string): string {
  let result = input.toLowerCase().trim();
  
  // Remove extra whitespace
  result = result.replace(/\s+/g, ' ');
  
  // Normalize separators: spaces around colon/dot
  result = result.replace(/\s*[:\.]\s*/g, ':');
  
  // Handle "chapter verse" with space instead of colon: "3 16" -> "3:16"
  // But only if it looks like two numbers at the end
  result = result.replace(/(\d+)\s+(\d+)$/g, '$1:$2');
  
  // Handle no space between book and chapter: "john3" -> "john 3"
  result = result.replace(/([a-z])(\d)/gi, '$1 $2');
  
  // Handle numbered books without space: "1john" is handled by findBook
  
  return result;
}

export interface ParsedReference {
  book: string;
  bookData: typeof BIBLE_BOOKS[0];
  chapter: number;
  verseStart: number | null;
  verseEnd: number | null;
  reference: string;
}

/**
 * Parse a flexible scripture reference
 * Returns null if cannot parse
 */
export function parseFlexibleReference(input: string): ParsedReference | null {
  const normalized = normalizeInput(input);
  
  // Pattern: [book] [chapter]:[verse][-endverse]
  // Book can be: "john", "1 john", "1john", "jn", etc.
  
  // Try to extract book name (everything before the first number that's clearly a chapter)
  // Handle numbered books specially
  
  let bookPart = '';
  let numberPart = '';
  
  // Check for numbered book prefix
  const numberedBookMatch = normalized.match(/^([123]\s*[a-z]+)\s+(.*)$/i);
  if (numberedBookMatch) {
    bookPart = numberedBookMatch[1];
    numberPart = numberedBookMatch[2];
  } else {
    // Regular book
    const regularMatch = normalized.match(/^([a-z\s]+?)\s*(\d.*)$/i);
    if (regularMatch) {
      bookPart = regularMatch[1].trim();
      numberPart = regularMatch[2];
    } else {
      // Maybe just a book name
      bookPart = normalized;
    }
  }
  
  // Find the book
  const book = findBook(bookPart);
  if (!book) return null;
  
  // Parse the number part: "3:16", "3:16-18", "3"
  let chapter: number | null = null;
  let verseStart: number | null = null;
  let verseEnd: number | null = null;
  
  if (numberPart) {
    // Try "chapter:verse-end"
    const fullMatch = numberPart.match(/^(\d+):(\d+)(?:\s*[-–]\s*(\d+))?$/);
    if (fullMatch) {
      chapter = parseInt(fullMatch[1], 10);
      verseStart = parseInt(fullMatch[2], 10);
      verseEnd = fullMatch[3] ? parseInt(fullMatch[3], 10) : null;
    } else {
      // Try just chapter
      const chapterMatch = numberPart.match(/^(\d+)$/);
      if (chapterMatch) {
        chapter = parseInt(chapterMatch[1], 10);
      }
    }
  }
  
  if (chapter === null) return null;
  
  // Validate chapter number
  if (chapter < 1 || chapter > book.chapters) return null;
  
  // Build reference string
  let refString = `${book.name} ${chapter}`;
  if (verseStart !== null) {
    refString += `:${verseStart}`;
    if (verseEnd !== null && verseEnd !== verseStart) {
      refString += `-${verseEnd}`;
    }
  }
  
  return {
    book: book.name,
    bookData: book,
    chapter,
    verseStart,
    verseEnd: verseEnd !== verseStart ? verseEnd : null,
    reference: refString,
  };
}

/**
 * Check if input looks like a scripture reference attempt
 * (as opposed to verse text search)
 */
export function looksLikeReference(input: string): boolean {
  const normalized = normalizeInput(input);
  
  // Has numbers and letters in reference-like pattern
  if (/[a-z]+\s*\d/i.test(normalized)) {
    // Check if first word could be a book
    const firstWord = normalized.split(/[\s\d]/)[0];
    if (findBook(firstWord) || getBookSuggestions(firstWord).length > 0) {
      return true;
    }
  }
  
  // Starts with a number (numbered book)
  if (/^[123]\s*[a-z]/i.test(normalized)) {
    return true;
  }
  
  return false;
}
