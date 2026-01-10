// ============================================
// Detection Module Tests
// ============================================

import { normalizeText, convertNumberWords } from '../lib/detection/normalizer';
import { parseScriptures, mightContainScripture } from '../lib/detection/parser';
import { findBook, containsTriggerKeywords, BIBLE_BOOKS } from '../lib/detection/books';

describe('Text Normalizer', () => {
  describe('convertNumberWords', () => {
    test('converts simple number words', () => {
      expect(convertNumberWords('three')).toBe('3');
      expect(convertNumberWords('sixteen')).toBe('16');
    });
    
    test('converts compound numbers', () => {
      expect(convertNumberWords('twenty three')).toBe('23');
      expect(convertNumberWords('forty-five')).toBe('45');
    });
    
    test('handles ordinals', () => {
      expect(convertNumberWords('first')).toBe('1');
      expect(convertNumberWords('second')).toBe('2');
      expect(convertNumberWords('third')).toBe('3');
    });
  });
  
  describe('normalizeText', () => {
    test('normalizes chapter and verse format', () => {
      const result = normalizeText('chapter three verse sixteen');
      expect(result).toContain('3:16');
    });
    
    test('handles book prefixes', () => {
      const result = normalizeText('first corinthians');
      expect(result).toContain('1 corinthians');
    });
    
    test('removes filler phrases', () => {
      const result = normalizeText("let's turn to john three sixteen");
      expect(result).not.toContain("let's turn to");
      expect(result).toContain('john');
    });
  });
});

describe('Scripture Parser', () => {
  describe('parseScriptures', () => {
    test('parses standard reference format', () => {
      const results = parseScriptures('John 3:16');
      expect(results.length).toBe(1);
      expect(results[0].reference.book).toBe('John');
      expect(results[0].reference.chapter).toBe(3);
      expect(results[0].reference.verseStart).toBe(16);
    });
    
    test('parses verse ranges', () => {
      const results = parseScriptures('Romans 8:28-30');
      expect(results.length).toBe(1);
      expect(results[0].reference.verseStart).toBe(28);
      expect(results[0].reference.verseEnd).toBe(30);
    });
    
    test('parses chapter-only references', () => {
      const results = parseScriptures('Psalm 23');
      expect(results.length).toBe(1);
      expect(results[0].reference.book).toBe('Psalms');
      expect(results[0].reference.chapter).toBe(23);
      expect(results[0].reference.verseStart).toBeNull();
    });
    
    test('parses numbered book references', () => {
      const results = parseScriptures('1 Corinthians 13:4-7');
      expect(results.length).toBe(1);
      expect(results[0].reference.book).toBe('1 Corinthians');
    });
    
    test('parses spoken format', () => {
      const results = parseScriptures('First Corinthians chapter thirteen');
      expect(results.length).toBe(1);
      expect(results[0].reference.book).toBe('1 Corinthians');
      expect(results[0].reference.chapter).toBe(13);
    });
    
    test('finds multiple references', () => {
      const results = parseScriptures('Read John 3:16 and Romans 8:28');
      expect(results.length).toBe(2);
    });
    
    test('handles no references', () => {
      const results = parseScriptures('Hello world, this is a test');
      expect(results.length).toBe(0);
    });
  });
  
  describe('mightContainScripture', () => {
    test('returns true for text with book names', () => {
      expect(mightContainScripture('Let us read from John')).toBe(true);
      expect(mightContainScripture('In the book of Romans')).toBe(true);
    });
    
    test('returns true for verse patterns', () => {
      expect(mightContainScripture('Look at 3:16')).toBe(true);
    });
    
    test('returns false for unrelated text', () => {
      expect(mightContainScripture('The weather is nice today')).toBe(false);
    });
  });
});

describe('Book Metadata', () => {
  describe('findBook', () => {
    test('finds books by canonical name', () => {
      const book = findBook('Genesis');
      expect(book).not.toBeNull();
      expect(book?.name).toBe('Genesis');
    });
    
    test('finds books by alias', () => {
      const book = findBook('gen');
      expect(book).not.toBeNull();
      expect(book?.name).toBe('Genesis');
    });
    
    test('finds numbered books', () => {
      const book = findBook('1 corinthians');
      expect(book).not.toBeNull();
      expect(book?.name).toBe('1 Corinthians');
    });
    
    test('returns null for invalid books', () => {
      const book = findBook('NotABook');
      expect(book).toBeNull();
    });
  });
  
  describe('containsTriggerKeywords', () => {
    test('returns true for Paul references', () => {
      expect(containsTriggerKeywords('As Paul wrote to the church')).toBe(true);
    });
    
    test('returns true for Jesus references', () => {
      expect(containsTriggerKeywords('Jesus said to the disciples')).toBe(true);
    });
    
    test('returns false for unrelated text', () => {
      expect(containsTriggerKeywords('The stock market went up today')).toBe(false);
    });
  });
  
  describe('BIBLE_BOOKS constant', () => {
    test('has 66 books (Protestant canon)', () => {
      expect(BIBLE_BOOKS.length).toBe(66);
    });
    
    test('has correct chapter counts for known books', () => {
      const genesis = BIBLE_BOOKS.find(b => b.name === 'Genesis');
      expect(genesis?.chapters).toBe(50);
      
      const psalms = BIBLE_BOOKS.find(b => b.name === 'Psalms');
      expect(psalms?.chapters).toBe(150);
      
      const revelation = BIBLE_BOOKS.find(b => b.name === 'Revelation');
      expect(revelation?.chapters).toBe(22);
    });
  });
});

describe('Integration Tests', () => {
  test('full pipeline: spoken reference to parsed result', () => {
    const spoken = "Let's turn to First Corinthians chapter thirteen verses four through seven";
    const results = parseScriptures(spoken);
    
    expect(results.length).toBe(1);
    expect(results[0].reference.book).toBe('1 Corinthians');
    expect(results[0].reference.chapter).toBe(13);
    expect(results[0].reference.verseStart).toBe(4);
    expect(results[0].reference.verseEnd).toBe(7);
  });
  
  test('handles real sermon patterns', () => {
    const sermonExcerpts = [
      "Open your bibles to Romans 8:28",
      "As we read in Psalm 23",
      "The apostle Paul wrote in Philippians 4:13",
      "Jesus said in Matthew chapter 11 verse 28",
      "Second Timothy 3:16-17 tells us",
    ];
    
    for (const excerpt of sermonExcerpts) {
      const results = parseScriptures(excerpt);
      expect(results.length).toBeGreaterThan(0);
    }
  });
});
