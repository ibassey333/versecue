// ============================================
// Bible Book Metadata
// Comprehensive list with all common aliases
// ============================================

import { BookMetadata } from '@/types';

export const BIBLE_BOOKS: BookMetadata[] = [
  // Old Testament
  { name: 'Genesis', aliases: ['gen', 'ge', 'gn'], chapters: 50, testament: 'old' },
  { name: 'Exodus', aliases: ['exod', 'exo', 'ex'], chapters: 40, testament: 'old' },
  { name: 'Leviticus', aliases: ['lev', 'le', 'lv'], chapters: 27, testament: 'old' },
  { name: 'Numbers', aliases: ['num', 'nu', 'nm', 'nb'], chapters: 36, testament: 'old' },
  { name: 'Deuteronomy', aliases: ['deut', 'de', 'dt'], chapters: 34, testament: 'old' },
  { name: 'Joshua', aliases: ['josh', 'jos', 'jsh'], chapters: 24, testament: 'old' },
  { name: 'Judges', aliases: ['judg', 'jdg', 'jg', 'jdgs'], chapters: 21, testament: 'old' },
  { name: 'Ruth', aliases: ['rth', 'ru'], chapters: 4, testament: 'old' },
  { name: '1 Samuel', aliases: ['1 sam', '1sam', '1st samuel', 'first samuel', 'i samuel', '1 sa', '1sa'], chapters: 31, testament: 'old' },
  { name: '2 Samuel', aliases: ['2 sam', '2sam', '2nd samuel', 'second samuel', 'ii samuel', '2 sa', '2sa'], chapters: 24, testament: 'old' },
  { name: '1 Kings', aliases: ['1 kgs', '1kgs', '1st kings', 'first kings', 'i kings', '1 ki', '1ki'], chapters: 22, testament: 'old' },
  { name: '2 Kings', aliases: ['2 kgs', '2kgs', '2nd kings', 'second kings', 'ii kings', '2 ki', '2ki'], chapters: 25, testament: 'old' },
  { name: '1 Chronicles', aliases: ['1 chr', '1chr', '1st chronicles', 'first chronicles', 'i chronicles', '1 ch', '1ch'], chapters: 29, testament: 'old' },
  { name: '2 Chronicles', aliases: ['2 chr', '2chr', '2nd chronicles', 'second chronicles', 'ii chronicles', '2 ch', '2ch'], chapters: 36, testament: 'old' },
  { name: 'Ezra', aliases: ['ezr', 'ez'], chapters: 10, testament: 'old' },
  { name: 'Nehemiah', aliases: ['neh', 'ne'], chapters: 13, testament: 'old' },
  { name: 'Esther', aliases: ['esth', 'est', 'es'], chapters: 10, testament: 'old' },
  { name: 'Job', aliases: ['jb'], chapters: 42, testament: 'old' },
  { name: 'Psalms', aliases: ['psalm', 'psa', 'ps', 'pss', 'psm'], chapters: 150, testament: 'old' },
  { name: 'Proverbs', aliases: ['prov', 'pro', 'prv', 'pr'], chapters: 31, testament: 'old' },
  { name: 'Ecclesiastes', aliases: ['eccl', 'ecc', 'ec', 'qoh'], chapters: 12, testament: 'old' },
  { name: 'Song of Solomon', aliases: ['song', 'song of songs', 'sos', 'so', 'canticles', 'canticle'], chapters: 8, testament: 'old' },
  { name: 'Isaiah', aliases: ['isa', 'is'], chapters: 66, testament: 'old' },
  { name: 'Jeremiah', aliases: ['jer', 'je', 'jr'], chapters: 52, testament: 'old' },
  { name: 'Lamentations', aliases: ['lam', 'la'], chapters: 5, testament: 'old' },
  { name: 'Ezekiel', aliases: ['ezek', 'eze', 'ezk'], chapters: 48, testament: 'old' },
  { name: 'Daniel', aliases: ['dan', 'da', 'dn'], chapters: 12, testament: 'old' },
  { name: 'Hosea', aliases: ['hos', 'ho'], chapters: 14, testament: 'old' },
  { name: 'Joel', aliases: ['joe', 'jl'], chapters: 3, testament: 'old' },
  { name: 'Amos', aliases: ['amo', 'am'], chapters: 9, testament: 'old' },
  { name: 'Obadiah', aliases: ['obad', 'ob'], chapters: 1, testament: 'old' },
  { name: 'Jonah', aliases: ['jon', 'jnh'], chapters: 4, testament: 'old' },
  { name: 'Micah', aliases: ['mic', 'mc'], chapters: 7, testament: 'old' },
  { name: 'Nahum', aliases: ['nah', 'na'], chapters: 3, testament: 'old' },
  { name: 'Habakkuk', aliases: ['hab', 'hb'], chapters: 3, testament: 'old' },
  { name: 'Zephaniah', aliases: ['zeph', 'zep', 'zp'], chapters: 3, testament: 'old' },
  { name: 'Haggai', aliases: ['hag', 'hg'], chapters: 2, testament: 'old' },
  { name: 'Zechariah', aliases: ['zech', 'zec', 'zc'], chapters: 14, testament: 'old' },
  { name: 'Malachi', aliases: ['mal', 'ml'], chapters: 4, testament: 'old' },

  // New Testament
  { name: 'Matthew', aliases: ['matt', 'mat', 'mt'], chapters: 28, testament: 'new' },
  { name: 'Mark', aliases: ['mrk', 'mk', 'mr'], chapters: 16, testament: 'new' },
  { name: 'Luke', aliases: ['luk', 'lk'], chapters: 24, testament: 'new' },
  { name: 'John', aliases: ['joh', 'jhn', 'jn'], chapters: 21, testament: 'new' },
  { name: 'Acts', aliases: ['act', 'ac'], chapters: 28, testament: 'new' },
  { name: 'Romans', aliases: ['rom', 'ro', 'rm'], chapters: 16, testament: 'new' },
  { name: '1 Corinthians', aliases: ['1 cor', '1cor', '1st corinthians', 'first corinthians', 'i corinthians', '1 co', '1co'], chapters: 16, testament: 'new' },
  { name: '2 Corinthians', aliases: ['2 cor', '2cor', '2nd corinthians', 'second corinthians', 'ii corinthians', '2 co', '2co'], chapters: 13, testament: 'new' },
  { name: 'Galatians', aliases: ['gal', 'ga'], chapters: 6, testament: 'new' },
  { name: 'Ephesians', aliases: ['eph', 'ephes'], chapters: 6, testament: 'new' },
  { name: 'Philippians', aliases: ['phil', 'php', 'pp'], chapters: 4, testament: 'new' },
  { name: 'Colossians', aliases: ['col', 'co'], chapters: 4, testament: 'new' },
  { name: '1 Thessalonians', aliases: ['1 thess', '1thess', '1st thessalonians', 'first thessalonians', 'i thessalonians', '1 th', '1th'], chapters: 5, testament: 'new' },
  { name: '2 Thessalonians', aliases: ['2 thess', '2thess', '2nd thessalonians', 'second thessalonians', 'ii thessalonians', '2 th', '2th'], chapters: 3, testament: 'new' },
  { name: '1 Timothy', aliases: ['1 tim', '1tim', '1st timothy', 'first timothy', 'i timothy', '1 ti', '1ti'], chapters: 6, testament: 'new' },
  { name: '2 Timothy', aliases: ['2 tim', '2tim', '2nd timothy', 'second timothy', 'ii timothy', '2 ti', '2ti'], chapters: 4, testament: 'new' },
  { name: 'Titus', aliases: ['tit', 'ti'], chapters: 3, testament: 'new' },
  { name: 'Philemon', aliases: ['philem', 'phm', 'pm'], chapters: 1, testament: 'new' },
  { name: 'Hebrews', aliases: ['heb', 'he'], chapters: 13, testament: 'new' },
  { name: 'James', aliases: ['jam', 'jas', 'jm'], chapters: 5, testament: 'new' },
  { name: '1 Peter', aliases: ['1 pet', '1pet', '1st peter', 'first peter', 'i peter', '1 pe', '1pe'], chapters: 5, testament: 'new' },
  { name: '2 Peter', aliases: ['2 pet', '2pet', '2nd peter', 'second peter', 'ii peter', '2 pe', '2pe'], chapters: 3, testament: 'new' },
  { name: '1 John', aliases: ['1 jn', '1jn', '1st john', 'first john', 'i john', '1 jo', '1jo'], chapters: 5, testament: 'new' },
  { name: '2 John', aliases: ['2 jn', '2jn', '2nd john', 'second john', 'ii john', '2 jo', '2jo'], chapters: 1, testament: 'new' },
  { name: '3 John', aliases: ['3 jn', '3jn', '3rd john', 'third john', 'iii john', '3 jo', '3jo'], chapters: 1, testament: 'new' },
  { name: 'Jude', aliases: ['jud', 'jd'], chapters: 1, testament: 'new' },
  { name: 'Revelation', aliases: ['rev', 're', 'revelations', 'apocalypse'], chapters: 22, testament: 'new' },
];

// Build lookup maps for fast access
export const BOOK_BY_NAME: Map<string, BookMetadata> = new Map();
export const BOOK_BY_ALIAS: Map<string, BookMetadata> = new Map();

// Initialize lookup maps
BIBLE_BOOKS.forEach(book => {
  // Add canonical name
  BOOK_BY_NAME.set(book.name.toLowerCase(), book);
  
  // Add all aliases
  book.aliases.forEach(alias => {
    BOOK_BY_ALIAS.set(alias.toLowerCase(), book);
  });
});

// Number word to digit conversion
export const NUMBER_WORDS: Record<string, number> = {
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
  'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
  'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14,
  'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
  'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
  'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
  'hundred': 100, 'one hundred': 100, 'a hundred': 100,
  'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5,
  'sixth': 6, 'seventh': 7, 'eighth': 8, 'ninth': 9, 'tenth': 10,
};

// Common filler phrases to remove before parsing
export const FILLER_PHRASES = [
  'let\'s turn to',
  'turn with me to',
  'turn to',
  'let\'s look at',
  'look at',
  'let\'s read from',
  'read from',
  'open your bibles to',
  'go to',
  'in the book of',
  'from the book of',
  'the book of',
  'please turn to',
  'if you would turn to',
  'we find in',
  'as we read in',
  'as it says in',
  'scripture says in',
  'the bible says in',
  'it says in',
  'we see in',
  'found in',
  'written in',
  'recorded in',
];

// Keywords that trigger LLM detection
export const LLM_TRIGGER_KEYWORDS = [
  'paul', 'jesus', 'moses', 'david', 'abraham', 'peter', 'john', 
  'prophet', 'apostle', 'disciples',
  'gospel', 'psalm', 'proverb', 'parable',
  'sermon on the mount', 'beatitudes', 'lord\'s prayer',
  'old testament', 'new testament',
  'wrote', 'said', 'taught', 'preached', 'spoke',
  'remember when', 'remember that', 'that passage', 'that verse',
  'as it is written', 'scripture tells us', 'the word says',
  'letter to', 'wrote to', 'epistle',
  'corinth', 'rome', 'ephesus', 'galatia', 'philippi', 'colossae', 'thessalonica',
  'love is patient', 'faith hope love', 'armor of god', 'fruit of the spirit',
  'the lord is my shepherd', 'in the beginning', 'for god so loved',
];

/**
 * Check if text contains LLM trigger keywords
 */
export function containsTriggerKeywords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return LLM_TRIGGER_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

/**
 * Find a book by name or alias
 */
export function findBook(input: string): BookMetadata | null {
  const normalized = input.toLowerCase().trim();
  
  // Try exact name match first
  const byName = BOOK_BY_NAME.get(normalized);
  if (byName) return byName;
  
  // Try alias match
  const byAlias = BOOK_BY_ALIAS.get(normalized);
  if (byAlias) return byAlias;
  
  // Try partial matching for common variations
  for (const book of BIBLE_BOOKS) {
    if (book.name.toLowerCase().startsWith(normalized) && normalized.length >= 3) {
      return book;
    }
  }
  
  return null;
}

/**
 * Validate chapter and verse numbers against book metadata
 */
export function validateReference(book: BookMetadata, chapter: number, verse?: number): boolean {
  if (chapter < 1 || chapter > book.chapters) {
    return false;
  }
  // We don't have verse counts, so we'll trust reasonable verse numbers
  if (verse !== undefined && (verse < 1 || verse > 200)) {
    return false;
  }
  return true;
}
