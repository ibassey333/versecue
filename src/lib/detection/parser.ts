// ============================================
// Deterministic Scripture Parser
// Extracts scripture references from normalized text
// ============================================

import { ScriptureReference } from '@/types';
import { BIBLE_BOOKS, findBook, validateReference } from './books';
import { normalizeText } from './normalizer';

// Build regex patterns for all book names
function buildBookPattern(): string {
  const allNames: string[] = [];
  
  for (const book of BIBLE_BOOKS) {
    // Add canonical name
    allNames.push(book.name.toLowerCase());
    // Add aliases
    allNames.push(...book.aliases);
  }
  
  // Sort by length (longest first) to match longer names first
  allNames.sort((a, b) => b.length - a.length);
  
  // Escape special regex characters and join
  return allNames
    .map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
}

const BOOK_PATTERN = buildBookPattern();

// Main scripture detection patterns
const SCRIPTURE_PATTERNS = [
  // Full reference: "John 3:16" or "John 3:16-18"
  new RegExp(`((?:\\d\\s+)?(?:${BOOK_PATTERN}))\\s*(\\d{1,3}):(\\d{1,3})(?:-(\\d{1,3}))?`, 'gi'),
  
  // Chapter only: "John 3" or "Psalm 23"
  new RegExp(`((?:\\d\\s+)?(?:${BOOK_PATTERN}))\\s+(\\d{1,3})(?!:)(?:\\b|$)`, 'gi'),
  
  // Just book reference (for context): "the book of John"
  new RegExp(`(?:book\\s+of\\s+)(${BOOK_PATTERN})`, 'gi'),
];

/**
 * Parse a single scripture reference match
 */
function parseMatch(
  bookStr: string,
  chapterStr?: string,
  verseStartStr?: string,
  verseEndStr?: string
): ScriptureReference | null {
  // Find the book
  const book = findBook(bookStr.trim());
  if (!book) return null;
  
  const chapter = chapterStr ? parseInt(chapterStr, 10) : 1;
  const verseStart = verseStartStr ? parseInt(verseStartStr, 10) : null;
  const verseEnd = verseEndStr ? parseInt(verseEndStr, 10) : null;
  
  // Validate
  if (!validateReference(book, chapter, verseStart ?? undefined)) {
    return null;
  }
  
  // Build reference string
  let reference = `${book.name} ${chapter}`;
  if (verseStart) {
    reference += `:${verseStart}`;
    if (verseEnd && verseEnd !== verseStart) {
      reference += `-${verseEnd}`;
    }
  }
  
  return {
    book: book.name,
    chapter,
    verseStart,
    verseEnd,
    reference,
  };
}

/**
 * Extract all scripture references from text
 */
export function parseScriptures(rawText: string): Array<{
  reference: ScriptureReference;
  matchedText: string;
  position: number;
}> {
  const results: Array<{
    reference: ScriptureReference;
    matchedText: string;
    position: number;
  }> = [];
  
  // Normalize the text first
  const normalizedText = normalizeText(rawText);
  const lowerText = normalizedText.toLowerCase();
  
  // Track what we've already found to avoid duplicates
  const foundRefs = new Set<string>();
  
  // Try each pattern
  for (const pattern of SCRIPTURE_PATTERNS) {
    // Reset regex state
    pattern.lastIndex = 0;
    
    let match;
    while ((match = pattern.exec(lowerText)) !== null) {
      const [fullMatch, book, chapter, verseStart, verseEnd] = match;
      
      const ref = parseMatch(book, chapter, verseStart, verseEnd);
      
      if (ref && !foundRefs.has(ref.reference)) {
        foundRefs.add(ref.reference);
        results.push({
          reference: ref,
          matchedText: fullMatch.trim(),
          position: match.index,
        });
      }
    }
  }
  
  // Sort by position in text
  results.sort((a, b) => a.position - b.position);
  
  return results;
}

/**
 * Quick check if text might contain a scripture reference
 * Used to short-circuit expensive processing
 */
export function mightContainScripture(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // Check for any book name or common alias
  for (const book of BIBLE_BOOKS) {
    if (lowerText.includes(book.name.toLowerCase())) {
      return true;
    }
    for (const alias of book.aliases) {
      // Only check longer aliases to avoid false positives
      if (alias.length >= 3 && lowerText.includes(alias)) {
        return true;
      }
    }
  }
  
  // Check for common patterns
  const quickPatterns = [
    /chapter\s+\d/i,
    /verse\s+\d/i,
    /\d+:\d+/,  // X:Y pattern
  ];
  
  return quickPatterns.some(p => p.test(text));
}

/**
 * Format a reference for display
 */
export function formatReference(ref: ScriptureReference): string {
  let str = `${ref.book} ${ref.chapter}`;
  if (ref.verseStart) {
    str += `:${ref.verseStart}`;
    if (ref.verseEnd && ref.verseEnd !== ref.verseStart) {
      str += `-${ref.verseEnd}`;
    }
  }
  return str;
}

/**
 * Compare two references for equality
 */
export function referencesEqual(a: ScriptureReference, b: ScriptureReference): boolean {
  return (
    a.book === b.book &&
    a.chapter === b.chapter &&
    a.verseStart === b.verseStart &&
    a.verseEnd === b.verseEnd
  );
}

// ============================================
// Parser Tests
// ============================================

export function runParserTests(): void {
  const testCases = [
    {
      input: "Let's turn to John 3:16 today",
      expected: [{ book: 'John', chapter: 3, verseStart: 16, verseEnd: null }],
    },
    {
      input: "Romans 8:28-30 is a powerful passage",
      expected: [{ book: 'Romans', chapter: 8, verseStart: 28, verseEnd: 30 }],
    },
    {
      input: "First Corinthians chapter 13",
      expected: [{ book: '1 Corinthians', chapter: 13, verseStart: null, verseEnd: null }],
    },
    {
      input: "Psalm 23 and John 14:6",
      expected: [
        { book: 'Psalms', chapter: 23, verseStart: null, verseEnd: null },
        { book: 'John', chapter: 14, verseStart: 6, verseEnd: null },
      ],
    },
    {
      input: "In Genesis chapter one verse one we read",
      expected: [{ book: 'Genesis', chapter: 1, verseStart: 1, verseEnd: null }],
    },
    {
      input: "Second Timothy 3:16-17",
      expected: [{ book: '2 Timothy', chapter: 3, verseStart: 16, verseEnd: 17 }],
    },
  ];
  
  console.log('Running parser tests...\n');
  
  for (const { input, expected } of testCases) {
    const results = parseScriptures(input);
    const passed = results.length === expected.length &&
      results.every((r, i) => 
        r.reference.book === expected[i].book &&
        r.reference.chapter === expected[i].chapter &&
        r.reference.verseStart === expected[i].verseStart &&
        r.reference.verseEnd === expected[i].verseEnd
      );
    
    console.log(`${passed ? '✓' : '✗'} "${input}"`);
    console.log(`  Expected: ${JSON.stringify(expected)}`);
    console.log(`  Got: ${JSON.stringify(results.map(r => ({
      book: r.reference.book,
      chapter: r.reference.chapter,
      verseStart: r.reference.verseStart,
      verseEnd: r.reference.verseEnd,
    })))}\n`);
  }
}
