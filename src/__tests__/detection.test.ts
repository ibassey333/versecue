// ============================================
// Detection Engine Tests
// ============================================

import { parseScriptures } from '../lib/detection/parser';
import { findPhraseMatches } from '../lib/detection/phrases';

describe('Scripture Parser', () => {
  test('parses basic references', () => {
    const results = parseScriptures('Read John 3:16 today');
    expect(results.length).toBe(1);
    expect(results[0].reference.book).toBe('John');
    expect(results[0].reference.chapter).toBe(3);
    expect(results[0].reference.verseStart).toBe(16);
  });
  
  test('parses verse ranges', () => {
    const results = parseScriptures('Psalm 23:1-6 is beautiful');
    expect(results.length).toBe(1);
    expect(results[0].reference.verseStart).toBe(1);
    expect(results[0].reference.verseEnd).toBe(6);
  });
  
  test('handles abbreviations', () => {
    const results = parseScriptures('See Rom 8:28');
    expect(results.length).toBe(1);
    expect(results[0].reference.book).toBe('Romans');
  });
  
  test('handles numbered books', () => {
    const results = parseScriptures('1 Corinthians 13:4-7');
    expect(results.length).toBe(1);
    expect(results[0].reference.book).toBe('1 Corinthians');
  });
});

describe('Phrase Matching', () => {
  test('finds common phrases', () => {
    const results = findPhraseMatches('for god so loved the world');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].reference).toBe('John 3:16');
  });
  
  test('handles case insensitivity', () => {
    const results = findPhraseMatches('THE LORD IS MY SHEPHERD');
    expect(results.length).toBeGreaterThan(0);
  });
  
  test('returns empty for non-matches', () => {
    const results = findPhraseMatches('hello world this is a test');
    expect(results.length).toBe(0);
  });
});
