// ============================================
// Text Normalizer
// Prepares transcript text for scripture parsing
// ============================================

import { NUMBER_WORDS, FILLER_PHRASES } from './books';

/**
 * Convert number words to digits
 * Handles compound numbers like "twenty three" → 23
 */
export function convertNumberWords(text: string): string {
  let result = text.toLowerCase();
  
  // Handle compound numbers (e.g., "twenty three" → "23")
  // First pass: handle teens and single digits after tens
  const compoundPattern = /(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)[\s-]?(one|two|three|four|five|six|seven|eight|nine)/gi;
  
  result = result.replace(compoundPattern, (match, tens, ones) => {
    const tensValue = NUMBER_WORDS[tens.toLowerCase()] || 0;
    const onesValue = NUMBER_WORDS[ones.toLowerCase()] || 0;
    return String(tensValue + onesValue);
  });
  
  // Handle "hundred" combinations (e.g., "one hundred nineteen" → "119")
  const hundredPattern = /(one|two|three|four|five|six|seven|eight|nine)?\s*hundred\s*(and\s*)?(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)?/gi;
  
  result = result.replace(hundredPattern, (match, hundreds, _and, remainder) => {
    const hundredsValue = hundreds ? NUMBER_WORDS[hundreds.toLowerCase()] || 1 : 1;
    const remainderValue = remainder ? NUMBER_WORDS[remainder.toLowerCase()] || 0 : 0;
    return String(hundredsValue * 100 + remainderValue);
  });
  
  // Second pass: convert remaining number words to digits
  // Sort by length to match longer phrases first
  const sortedWords = Object.entries(NUMBER_WORDS)
    .sort((a, b) => b[0].length - a[0].length);
  
  for (const [word, digit] of sortedWords) {
    // Use word boundary matching to avoid partial replacements
    const wordPattern = new RegExp(`\\b${word}\\b`, 'gi');
    result = result.replace(wordPattern, String(digit));
  }
  
  return result;
}

/**
 * Normalize book prefix (1st, first, I, etc.)
 */
export function normalizeBookPrefix(text: string): string {
  let result = text;
  
  // "first" → "1", "second" → "2", "third" → "3"
  result = result.replace(/\bfirst\s+/gi, '1 ');
  result = result.replace(/\bsecond\s+/gi, '2 ');
  result = result.replace(/\bthird\s+/gi, '3 ');
  
  // "1st" → "1", "2nd" → "2", "3rd" → "3"
  result = result.replace(/\b1st\s+/gi, '1 ');
  result = result.replace(/\b2nd\s+/gi, '2 ');
  result = result.replace(/\b3rd\s+/gi, '3 ');
  
  // Roman numerals: "I John" → "1 John", "II Peter" → "2 Peter"
  result = result.replace(/\biii\s+/gi, '3 ');
  result = result.replace(/\bii\s+/gi, '2 ');
  result = result.replace(/\bi\s+/gi, '1 ');
  
  return result;
}

/**
 * Remove filler phrases that precede scripture references
 */
export function removeFiller(text: string): string {
  let result = text.toLowerCase();
  
  // Sort by length to remove longer phrases first
  const sortedFillers = [...FILLER_PHRASES].sort((a, b) => b.length - a.length);
  
  for (const filler of sortedFillers) {
    result = result.replace(new RegExp(filler, 'gi'), ' ');
  }
  
  return result;
}

/**
 * Normalize verse range indicators
 */
export function normalizeRanges(text: string): string {
  let result = text;
  
  // "through" → "-", "to" → "-" (when between numbers)
  result = result.replace(/(\d+)\s*(?:through|thru|to)\s*(\d+)/gi, '$1-$2');
  
  // "verses 28 and 29" → "28-29"
  result = result.replace(/verses?\s*(\d+)\s*(?:and|&)\s*(\d+)/gi, '$1-$2');
  
  // "starting at verse X" → just capture the verse
  result = result.replace(/starting\s+(?:at\s+)?(?:verse\s+)?(\d+)/gi, ':$1');
  
  return result;
}

/**
 * Normalize "chapter X verse Y" format
 */
export function normalizeChapterVerse(text: string): string {
  let result = text;
  
  // "chapter 3 verse 16" → "3:16"
  result = result.replace(/chapter\s*(\d+)\s*,?\s*verse\s*(\d+)/gi, '$1:$2');
  
  // "chapter 3, verses 16 through 18" → "3:16-18"
  result = result.replace(/chapter\s*(\d+)\s*,?\s*verses?\s*(\d+)\s*-\s*(\d+)/gi, '$1:$2-$3');
  
  // "chapter 3" alone → "3"
  result = result.replace(/chapter\s*(\d+)/gi, '$1');
  
  // "verse 16" alone (when chapter already established)
  result = result.replace(/verse\s*(\d+)/gi, ':$1');
  
  return result;
}

/**
 * Clean and normalize whitespace
 */
export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\s+/g, ' ')  // Multiple spaces to single
    .replace(/\s*:\s*/g, ':')  // Remove spaces around colons
    .replace(/\s*-\s*/g, '-')  // Remove spaces around dashes
    .trim();
}

/**
 * Fix common speech-to-text errors
 */
export function fixSTTErrors(text: string): string {
  let result = text;
  
  // Common misheard book names
  const corrections: Record<string, string> = {
    'revelations': 'revelation',
    'song of songs': 'song of solomon',
    'canticles': 'song of solomon',
    'psalter': 'psalms',
    'phillip ians': 'philippians',
    'corinthian': 'corinthians',
    'ephesian': 'ephesians',
    'philippian': 'philippians',
    'colossian': 'colossians',
    'thessalonian': 'thessalonians',
    'galatian': 'galatians',
  };
  
  for (const [wrong, right] of Object.entries(corrections)) {
    result = result.replace(new RegExp(`\\b${wrong}\\b`, 'gi'), right);
  }
  
  return result;
}

/**
 * Main normalization pipeline
 * Transforms raw transcript text into parseable format
 */
export function normalizeText(rawText: string): string {
  let text = rawText;
  
  // Step 1: Fix common STT errors
  text = fixSTTErrors(text);
  
  // Step 2: Normalize book prefixes (first, 1st, I, etc.)
  text = normalizeBookPrefix(text);
  
  // Step 3: Convert number words to digits
  text = convertNumberWords(text);
  
  // Step 4: Normalize "chapter X verse Y" format
  text = normalizeChapterVerse(text);
  
  // Step 5: Normalize range indicators
  text = normalizeRanges(text);
  
  // Step 6: Remove filler phrases
  text = removeFiller(text);
  
  // Step 7: Clean whitespace
  text = normalizeWhitespace(text);
  
  return text;
}

// ============================================
// Tests for normalizer functions
// ============================================

export function runNormalizerTests(): void {
  const testCases = [
    {
      input: "Turn to John chapter three verse sixteen",
      expected: "john 3:16",
    },
    {
      input: "First Corinthians chapter thirteen",
      expected: "1 corinthians 13",
    },
    {
      input: "Romans chapter eight verses twenty eight through thirty",
      expected: "romans 8:28-30",
    },
    {
      input: "Let's look at Psalm one nineteen",
      expected: "psalm 119",
    },
    {
      input: "II Peter chapter one verse three",
      expected: "2 peter 1:3",
    },
    {
      input: "Revelations twenty two",
      expected: "revelation 22",
    },
  ];
  
  console.log('Running normalizer tests...\n');
  
  for (const { input, expected } of testCases) {
    const result = normalizeText(input);
    const passed = result.includes(expected);
    console.log(`${passed ? '✓' : '✗'} "${input}"`);
    console.log(`  Expected: "${expected}"`);
    console.log(`  Got: "${result}"\n`);
  }
}
