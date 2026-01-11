// ============================================
// Scripture Parser v2.5 - Handles number words
// "Romans two verse 21" → Romans 2:21
// ============================================

import { ScriptureReference } from '@/types';

interface ParseResult {
  reference: ScriptureReference;
  matchedText: string;
}

// Number words to digits
const NUMBER_WORDS: Record<string, number> = {
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
  'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
  'twenty-one': 21, 'twenty-two': 22, 'twenty-three': 23, 'twenty-four': 24, 'twenty-five': 25,
  'twenty-six': 26, 'twenty-seven': 27, 'twenty-eight': 28, 'twenty-nine': 29, 'thirty': 30,
  'thirty-one': 31, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
  'hundred': 100, 'one hundred': 100, 'one hundred and': 100,
};

// Convert number word or digit string to number
function parseNumber(input: string): number | null {
  const trimmed = input.trim().toLowerCase();
  
  // Check if it's a digit
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }
  
  // Check number words
  if (NUMBER_WORDS[trimmed] !== undefined) {
    return NUMBER_WORDS[trimmed];
  }
  
  return null;
}

// Pre-process text to normalize number words to digits
function normalizeNumbers(text: string): string {
  let result = text;
  
  // Replace number words with digits (case-insensitive)
  const numberPattern = /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)\b/gi;
  
  result = result.replace(numberPattern, (match) => {
    const num = NUMBER_WORDS[match.toLowerCase()];
    return num !== undefined ? num.toString() : match;
  });
  
  return result;
}

const BOOK_ALIASES: Record<string, string> = {
  // Old Testament
  'genesis': 'Genesis', 'gen': 'Genesis',
  'exodus': 'Exodus', 'ex': 'Exodus', 'exod': 'Exodus',
  'leviticus': 'Leviticus', 'lev': 'Leviticus',
  'numbers': 'Numbers', 'num': 'Numbers',
  'deuteronomy': 'Deuteronomy', 'deut': 'Deuteronomy',
  'joshua': 'Joshua', 'josh': 'Joshua',
  'judges': 'Judges', 'judg': 'Judges',
  'ruth': 'Ruth',
  '1 samuel': '1 Samuel', '1samuel': '1 Samuel', 'first samuel': '1 Samuel', '1 sam': '1 Samuel', '1sam': '1 Samuel',
  '2 samuel': '2 Samuel', '2samuel': '2 Samuel', 'second samuel': '2 Samuel', '2 sam': '2 Samuel', '2sam': '2 Samuel',
  '1 kings': '1 Kings', '1kings': '1 Kings', 'first kings': '1 Kings', '1 kgs': '1 Kings',
  '2 kings': '2 Kings', '2kings': '2 Kings', 'second kings': '2 Kings', '2 kgs': '2 Kings',
  '1 chronicles': '1 Chronicles', '1chronicles': '1 Chronicles', 'first chronicles': '1 Chronicles', '1 chron': '1 Chronicles',
  '2 chronicles': '2 Chronicles', '2chronicles': '2 Chronicles', 'second chronicles': '2 Chronicles', '2 chron': '2 Chronicles',
  'ezra': 'Ezra',
  'nehemiah': 'Nehemiah', 'neh': 'Nehemiah',
  'esther': 'Esther', 'esth': 'Esther', 'esta': 'Esther', 'ester': 'Esther',
  'job': 'Job',
  'psalms': 'Psalms', 'psalm': 'Psalms', 'ps': 'Psalms', 'psa': 'Psalms', 'sam': 'Psalms', "sam's": 'Psalms', 'sams': 'Psalms', 'some': 'Psalms', 'sums': 'Psalms',
  'proverbs': 'Proverbs', 'prov': 'Proverbs', 'pro': 'Proverbs',
  'ecclesiastes': 'Ecclesiastes', 'eccl': 'Ecclesiastes', 'eccles': 'Ecclesiastes',
  'song of solomon': 'Song of Solomon', 'song': 'Song of Solomon', 'songs': 'Song of Solomon', 'sos': 'Song of Solomon',
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
  // New Testament
  'matthew': 'Matthew', 'matt': 'Matthew', 'mat': 'Matthew',
  'mark': 'Mark', 'mk': 'Mark',
  'luke': 'Luke', 'lk': 'Luke',
  'john': 'John', 'jn': 'John',
  'acts': 'Acts',
  'romans': 'Romans', 'rom': 'Romans', 'romance': 'Romans',
  '1 corinthians': '1 Corinthians', '1corinthians': '1 Corinthians', 'first corinthians': '1 Corinthians', '1 cor': '1 Corinthians', '1cor': '1 Corinthians',
  '2 corinthians': '2 Corinthians', '2corinthians': '2 Corinthians', 'second corinthians': '2 Corinthians', '2 cor': '2 Corinthians', '2cor': '2 Corinthians',
  'galatians': 'Galatians', 'gal': 'Galatians',
  'ephesians': 'Ephesians', 'eph': 'Ephesians',
  'philippians': 'Philippians', 'phil': 'Philippians', 'php': 'Philippians',
  'colossians': 'Colossians', 'col': 'Colossians',
  '1 thessalonians': '1 Thessalonians', '1thessalonians': '1 Thessalonians', 'first thessalonians': '1 Thessalonians', '1 thess': '1 Thessalonians', '1thess': '1 Thessalonians',
  '2 thessalonians': '2 Thessalonians', '2thessalonians': '2 Thessalonians', 'second thessalonians': '2 Thessalonians', '2 thess': '2 Thessalonians', '2thess': '2 Thessalonians',
  '1 timothy': '1 Timothy', '1timothy': '1 Timothy', 'first timothy': '1 Timothy', '1 tim': '1 Timothy', '1tim': '1 Timothy',
  '2 timothy': '2 Timothy', '2timothy': '2 Timothy', 'second timothy': '2 Timothy', '2 tim': '2 Timothy', '2tim': '2 Timothy',
  'titus': 'Titus',
  'philemon': 'Philemon', 'philem': 'Philemon', 'phlm': 'Philemon',
  'hebrews': 'Hebrews', 'heb': 'Hebrews',
  'james': 'James', 'jas': 'James',
  '1 peter': '1 Peter', '1peter': '1 Peter', 'first peter': '1 Peter', '1 pet': '1 Peter', '1pet': '1 Peter',
  '2 peter': '2 Peter', '2peter': '2 Peter', 'second peter': '2 Peter', '2 pet': '2 Peter', '2pet': '2 Peter',
  '1 john': '1 John', '1john': '1 John', 'first john': '1 John', '1 jn': '1 John',
  '2 john': '2 John', '2john': '2 John', 'second john': '2 John', '2 jn': '2 John',
  '3 john': '3 John', '3john': '3 John', 'third john': '3 John', '3 jn': '3 John',
  'jude': 'Jude',
  'revelation': 'Revelation', 'revelations': 'Revelation', 'rev': 'Revelation',
};

function normalizeBookName(input: string): string | null {
  let cleaned = input.toLowerCase().trim();
  cleaned = cleaned.replace(/^(?:the\s+)?book\s+of\s+/i, '');
  cleaned = cleaned.trim();
  return BOOK_ALIASES[cleaned] || null;
}

function addResult(
  results: ParseResult[],
  seenRefs: Set<string>,
  book: string,
  chapter: number,
  verseStart: number | null,
  verseEnd: number | null,
  matchedText: string,
  patternName: string
): void {
  let refString = `${book} ${chapter}`;
  if (verseStart !== null) {
    refString += `:${verseStart}`;
    if (verseEnd && verseEnd !== verseStart) {
      refString += `-${verseEnd}`;
    }
  }
  
  if (seenRefs.has(refString)) return;
  seenRefs.add(refString);
  
  console.log(`[VerseCue Parser] ${patternName}:`, refString, `(from: "${matchedText}")`);
  
  results.push({
    reference: { book, chapter, verseStart, verseEnd: verseEnd !== verseStart ? verseEnd : null, reference: refString },
    matchedText,
  });
}

export function parseScriptures(text: string): ParseResult[] {
  const results: ParseResult[] = [];
  const seenRefs = new Set<string>();
  
  // Normalize number words to digits FIRST
  const normalizedText = normalizeNumbers(text);
  
  console.log('[VerseCue Parser] Original:', text.substring(0, 60));
  console.log('[VerseCue Parser] Normalized:', normalizedText.substring(0, 60));
  
  let match;
  
  // PATTERN 1: Standard "John 3:16" or "Romans 2:21"
  const p1 = /\b((?:(?:1|2|3|first|second|third)\s+)?[a-z]+(?:'s)?)\s+(\d+)[:.](\d+)(?:\s*[-–]\s*(\d+))?\b/gi;
  while ((match = p1.exec(normalizedText)) !== null) {
    const book = normalizeBookName(match[1]);
    if (!book) continue;
    addResult(results, seenRefs, book, parseInt(match[2]), parseInt(match[3]), match[4] ? parseInt(match[4]) : null, match[0], 'Standard');
  }
  
  // PATTERN 2: "Book of Isaiah 5:3"
  const p2 = /\b(?:the\s+)?book\s+of\s+([a-z]+)\s+(\d+)[:.](\d+)(?:\s*[-–]\s*(\d+))?\b/gi;
  while ((match = p2.exec(normalizedText)) !== null) {
    const book = normalizeBookName(match[1]);
    if (!book) continue;
    addResult(results, seenRefs, book, parseInt(match[2]), parseInt(match[3]), match[4] ? parseInt(match[4]) : null, match[0], 'BookOf');
  }
  
  // PATTERN 3: "John chapter 3 verse 16"
  const p3 = /\b((?:(?:1|2|3|first|second|third)\s+)?[a-z]+(?:'s)?)\s+chapter\s+(\d+)\s+verse\s+(\d+)(?:\s*(?:to|through|-)\s*(\d+))?\b/gi;
  while ((match = p3.exec(normalizedText)) !== null) {
    const book = normalizeBookName(match[1]);
    if (!book) continue;
    addResult(results, seenRefs, book, parseInt(match[2]), parseInt(match[3]), match[4] ? parseInt(match[4]) : null, match[0], 'Spoken');
  }
  
  // PATTERN 4: "Book of Isaiah chapter 5:3"
  const p4 = /\b(?:the\s+)?book\s+of\s+([a-z]+)\s+chapter\s+(\d+)[:.](\d+)(?:\s*[-–]\s*(\d+))?\b/gi;
  while ((match = p4.exec(normalizedText)) !== null) {
    const book = normalizeBookName(match[1]);
    if (!book) continue;
    addResult(results, seenRefs, book, parseInt(match[2]), parseInt(match[3]), match[4] ? parseInt(match[4]) : null, match[0], 'BookOfChapter');
  }
  
  // PATTERN 5: "Book of Isaiah chapter 10 verse 21"
  const p5 = /\b(?:the\s+)?book\s+of\s+([a-z]+)\s+chapter\s+(\d+)\s+verse\s+(\d+)(?:\s*(?:to|through|-)\s*(\d+))?\b/gi;
  while ((match = p5.exec(normalizedText)) !== null) {
    const book = normalizeBookName(match[1]);
    if (!book) continue;
    addResult(results, seenRefs, book, parseInt(match[2]), parseInt(match[3]), match[4] ? parseInt(match[4]) : null, match[0], 'BookOfSpoken');
  }
  
  // PATTERN 6: "Book of psalm 105 verse 11"
  const p6 = /\b(?:the\s+)?book\s+of\s+([a-z]+(?:'s)?)\s+(\d+)\s+verse\s+(\d+)(?:\s*(?:to|through|-)\s*(\d+))?\b/gi;
  while ((match = p6.exec(normalizedText)) !== null) {
    const book = normalizeBookName(match[1]);
    if (!book) continue;
    addResult(results, seenRefs, book, parseInt(match[2]), parseInt(match[3]), match[4] ? parseInt(match[4]) : null, match[0], 'BookOfVerse');
  }
  
  // PATTERN 7: "Romans 2 verse 21" or "Psalms 105 verse 11"
  const p7 = /\b((?:(?:1|2|3|first|second|third)\s+)?[a-z]+(?:'s)?)\s+(\d+)\s+verse\s+(\d+)(?:\s*(?:to|through|-)\s*(\d+))?\b/gi;
  while ((match = p7.exec(normalizedText)) !== null) {
    const book = normalizeBookName(match[1]);
    if (!book) continue;
    addResult(results, seenRefs, book, parseInt(match[2]), parseInt(match[3]), match[4] ? parseInt(match[4]) : null, match[0], 'ChapterVerse');
  }
  
  // PATTERN 8: "in Romans 2" or "from John 3" (with preposition)
  const p8 = /\b(?:in|from|to|of)\s+((?:(?:1|2|3|first|second|third)\s+)?[a-z]+)\s+(\d+)[:.](\d+)(?:\s*[-–]\s*(\d+))?\b/gi;
  while ((match = p8.exec(normalizedText)) !== null) {
    const book = normalizeBookName(match[1]);
    if (!book) continue;
    addResult(results, seenRefs, book, parseInt(match[2]), parseInt(match[3]), match[4] ? parseInt(match[4]) : null, match[0], 'Preposition');
  }
  
  // PATTERN 9: Chapter only "John 3", "Psalm 23"
  const p9 = /\b((?:(?:1|2|3|first|second|third)\s+)?[a-z]+(?:'s)?)\s+(\d+)\b(?!\s*[:.]\s*\d)(?!\s+verse)(?!\s+chapter)/gi;
  while ((match = p9.exec(normalizedText)) !== null) {
    const book = normalizeBookName(match[1]);
    if (!book) continue;
    const refString = `${book} ${match[2]}`;
    const hasSpecific = Array.from(seenRefs).some(r => r.startsWith(refString + ':'));
    if (hasSpecific) continue;
    addResult(results, seenRefs, book, parseInt(match[2]), null, null, match[0], 'ChapterOnly');
  }
  
  console.log('[VerseCue Parser] Total:', results.length);
  return results;
}
