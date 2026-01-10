// ============================================
// Common Bible Verse Phrases
// For detecting verbatim quotes
// ============================================

interface PhraseMatch {
  phrase: string;
  reference: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number | null;
}

// 50 most commonly quoted verses with recognizable phrases
export const COMMON_PHRASES: PhraseMatch[] = [
  // John
  { phrase: "for god so loved the world", reference: "John 3:16", book: "John", chapter: 3, verseStart: 16, verseEnd: null },
  { phrase: "gave his only begotten son", reference: "John 3:16", book: "John", chapter: 3, verseStart: 16, verseEnd: null },
  { phrase: "i am the way the truth and the life", reference: "John 14:6", book: "John", chapter: 14, verseStart: 6, verseEnd: null },
  { phrase: "no one comes to the father except through me", reference: "John 14:6", book: "John", chapter: 14, verseStart: 6, verseEnd: null },
  { phrase: "you will know the truth and the truth will set you free", reference: "John 8:32", book: "John", chapter: 8, verseStart: 32, verseEnd: null },
  { phrase: "the truth shall make you free", reference: "John 8:32", book: "John", chapter: 8, verseStart: 32, verseEnd: null },
  { phrase: "i am the good shepherd", reference: "John 10:11", book: "John", chapter: 10, verseStart: 11, verseEnd: null },
  { phrase: "i am the bread of life", reference: "John 6:35", book: "John", chapter: 6, verseStart: 35, verseEnd: null },
  { phrase: "i am the light of the world", reference: "John 8:12", book: "John", chapter: 8, verseStart: 12, verseEnd: null },
  { phrase: "i am the resurrection and the life", reference: "John 11:25", book: "John", chapter: 11, verseStart: 25, verseEnd: null },
  { phrase: "in the beginning was the word", reference: "John 1:1", book: "John", chapter: 1, verseStart: 1, verseEnd: null },
  
  // Psalms
  { phrase: "the lord is my shepherd", reference: "Psalm 23:1", book: "Psalms", chapter: 23, verseStart: 1, verseEnd: null },
  { phrase: "i shall not want", reference: "Psalm 23:1", book: "Psalms", chapter: 23, verseStart: 1, verseEnd: null },
  { phrase: "though i walk through the valley of the shadow of death", reference: "Psalm 23:4", book: "Psalms", chapter: 23, verseStart: 4, verseEnd: null },
  { phrase: "thy rod and thy staff they comfort me", reference: "Psalm 23:4", book: "Psalms", chapter: 23, verseStart: 4, verseEnd: null },
  { phrase: "be still and know that i am god", reference: "Psalm 46:10", book: "Psalms", chapter: 46, verseStart: 10, verseEnd: null },
  { phrase: "create in me a clean heart", reference: "Psalm 51:10", book: "Psalms", chapter: 51, verseStart: 10, verseEnd: null },
  { phrase: "this is the day the lord has made", reference: "Psalm 118:24", book: "Psalms", chapter: 118, verseStart: 24, verseEnd: null },
  { phrase: "your word is a lamp to my feet", reference: "Psalm 119:105", book: "Psalms", chapter: 119, verseStart: 105, verseEnd: null },
  
  // Proverbs
  { phrase: "trust in the lord with all your heart", reference: "Proverbs 3:5", book: "Proverbs", chapter: 3, verseStart: 5, verseEnd: 6 },
  { phrase: "lean not on your own understanding", reference: "Proverbs 3:5", book: "Proverbs", chapter: 3, verseStart: 5, verseEnd: 6 },
  { phrase: "train up a child in the way he should go", reference: "Proverbs 22:6", book: "Proverbs", chapter: 22, verseStart: 6, verseEnd: null },
  { phrase: "as iron sharpens iron", reference: "Proverbs 27:17", book: "Proverbs", chapter: 27, verseStart: 17, verseEnd: null },
  
  // Romans
  { phrase: "for all have sinned and fall short", reference: "Romans 3:23", book: "Romans", chapter: 3, verseStart: 23, verseEnd: null },
  { phrase: "the wages of sin is death", reference: "Romans 6:23", book: "Romans", chapter: 6, verseStart: 23, verseEnd: null },
  { phrase: "the gift of god is eternal life", reference: "Romans 6:23", book: "Romans", chapter: 6, verseStart: 23, verseEnd: null },
  { phrase: "all things work together for good", reference: "Romans 8:28", book: "Romans", chapter: 8, verseStart: 28, verseEnd: null },
  { phrase: "if god is for us who can be against us", reference: "Romans 8:31", book: "Romans", chapter: 8, verseStart: 31, verseEnd: null },
  { phrase: "nothing can separate us from the love of god", reference: "Romans 8:38-39", book: "Romans", chapter: 8, verseStart: 38, verseEnd: 39 },
  { phrase: "do not conform to the pattern of this world", reference: "Romans 12:2", book: "Romans", chapter: 12, verseStart: 2, verseEnd: null },
  { phrase: "be transformed by the renewing of your mind", reference: "Romans 12:2", book: "Romans", chapter: 12, verseStart: 2, verseEnd: null },
  
  // Philippians
  { phrase: "i can do all things through christ", reference: "Philippians 4:13", book: "Philippians", chapter: 4, verseStart: 13, verseEnd: null },
  { phrase: "who strengthens me", reference: "Philippians 4:13", book: "Philippians", chapter: 4, verseStart: 13, verseEnd: null },
  { phrase: "do not be anxious about anything", reference: "Philippians 4:6", book: "Philippians", chapter: 4, verseStart: 6, verseEnd: 7 },
  { phrase: "the peace of god which surpasses all understanding", reference: "Philippians 4:7", book: "Philippians", chapter: 4, verseStart: 7, verseEnd: null },
  
  // Jeremiah
  { phrase: "for i know the plans i have for you", reference: "Jeremiah 29:11", book: "Jeremiah", chapter: 29, verseStart: 11, verseEnd: null },
  { phrase: "plans to prosper you and not to harm you", reference: "Jeremiah 29:11", book: "Jeremiah", chapter: 29, verseStart: 11, verseEnd: null },
  
  // Isaiah
  { phrase: "those who wait on the lord shall renew their strength", reference: "Isaiah 40:31", book: "Isaiah", chapter: 40, verseStart: 31, verseEnd: null },
  { phrase: "mount up with wings like eagles", reference: "Isaiah 40:31", book: "Isaiah", chapter: 40, verseStart: 31, verseEnd: null },
  { phrase: "fear not for i am with you", reference: "Isaiah 41:10", book: "Isaiah", chapter: 41, verseStart: 10, verseEnd: null },
  
  // Matthew
  { phrase: "love your enemies", reference: "Matthew 5:44", book: "Matthew", chapter: 5, verseStart: 44, verseEnd: null },
  { phrase: "seek first the kingdom of god", reference: "Matthew 6:33", book: "Matthew", chapter: 6, verseStart: 33, verseEnd: null },
  { phrase: "ask and it will be given to you", reference: "Matthew 7:7", book: "Matthew", chapter: 7, verseStart: 7, verseEnd: null },
  { phrase: "seek and you will find", reference: "Matthew 7:7", book: "Matthew", chapter: 7, verseStart: 7, verseEnd: null },
  { phrase: "knock and the door will be opened", reference: "Matthew 7:7", book: "Matthew", chapter: 7, verseStart: 7, verseEnd: null },
  { phrase: "come to me all you who are weary", reference: "Matthew 11:28", book: "Matthew", chapter: 11, verseStart: 28, verseEnd: null },
  { phrase: "i will give you rest", reference: "Matthew 11:28", book: "Matthew", chapter: 11, verseStart: 28, verseEnd: null },
  { phrase: "go and make disciples of all nations", reference: "Matthew 28:19", book: "Matthew", chapter: 28, verseStart: 19, verseEnd: 20 },
  { phrase: "i am with you always", reference: "Matthew 28:20", book: "Matthew", chapter: 28, verseStart: 20, verseEnd: null },
  
  // Galatians
  { phrase: "the fruit of the spirit is love joy peace", reference: "Galatians 5:22-23", book: "Galatians", chapter: 5, verseStart: 22, verseEnd: 23 },
  
  // Ephesians
  { phrase: "by grace you have been saved through faith", reference: "Ephesians 2:8", book: "Ephesians", chapter: 2, verseStart: 8, verseEnd: 9 },
  { phrase: "put on the full armor of god", reference: "Ephesians 6:11", book: "Ephesians", chapter: 6, verseStart: 11, verseEnd: null },
  
  // Hebrews
  { phrase: "faith is the substance of things hoped for", reference: "Hebrews 11:1", book: "Hebrews", chapter: 11, verseStart: 1, verseEnd: null },
  { phrase: "the evidence of things not seen", reference: "Hebrews 11:1", book: "Hebrews", chapter: 11, verseStart: 1, verseEnd: null },
  
  // 1 Corinthians
  { phrase: "love is patient love is kind", reference: "1 Corinthians 13:4", book: "1 Corinthians", chapter: 13, verseStart: 4, verseEnd: 7 },
  { phrase: "faith hope and love", reference: "1 Corinthians 13:13", book: "1 Corinthians", chapter: 13, verseStart: 13, verseEnd: null },
  { phrase: "the greatest of these is love", reference: "1 Corinthians 13:13", book: "1 Corinthians", chapter: 13, verseStart: 13, verseEnd: null },
  
  // 2 Corinthians
  { phrase: "if anyone is in christ he is a new creation", reference: "2 Corinthians 5:17", book: "2 Corinthians", chapter: 5, verseStart: 17, verseEnd: null },
  { phrase: "the old has gone the new has come", reference: "2 Corinthians 5:17", book: "2 Corinthians", chapter: 5, verseStart: 17, verseEnd: null },
  { phrase: "my grace is sufficient for you", reference: "2 Corinthians 12:9", book: "2 Corinthians", chapter: 12, verseStart: 9, verseEnd: null },
  
  // 1 Peter
  { phrase: "cast all your anxiety on him", reference: "1 Peter 5:7", book: "1 Peter", chapter: 5, verseStart: 7, verseEnd: null },
  { phrase: "because he cares for you", reference: "1 Peter 5:7", book: "1 Peter", chapter: 5, verseStart: 7, verseEnd: null },
  
  // James
  { phrase: "faith without works is dead", reference: "James 2:26", book: "James", chapter: 2, verseStart: 26, verseEnd: null },
  
  // 1 John
  { phrase: "if we confess our sins", reference: "1 John 1:9", book: "1 John", chapter: 1, verseStart: 9, verseEnd: null },
  { phrase: "he is faithful and just to forgive us", reference: "1 John 1:9", book: "1 John", chapter: 1, verseStart: 9, verseEnd: null },
  { phrase: "god is love", reference: "1 John 4:8", book: "1 John", chapter: 4, verseStart: 8, verseEnd: null },
  
  // Genesis
  { phrase: "in the beginning god created", reference: "Genesis 1:1", book: "Genesis", chapter: 1, verseStart: 1, verseEnd: null },
  { phrase: "let there be light", reference: "Genesis 1:3", book: "Genesis", chapter: 1, verseStart: 3, verseEnd: null },
  
  // Joshua
  { phrase: "be strong and courageous", reference: "Joshua 1:9", book: "Joshua", chapter: 1, verseStart: 9, verseEnd: null },
  
  // Revelation
  { phrase: "behold i stand at the door and knock", reference: "Revelation 3:20", book: "Revelation", chapter: 3, verseStart: 20, verseEnd: null },
  { phrase: "i am the alpha and the omega", reference: "Revelation 22:13", book: "Revelation", chapter: 22, verseStart: 13, verseEnd: null },
];

/**
 * Find verse matches from common phrases in text
 */
export function findPhraseMatches(text: string): PhraseMatch[] {
  const normalizedText = text.toLowerCase().replace(/[^\w\s]/g, '');
  const matches: PhraseMatch[] = [];
  const seenRefs = new Set<string>();
  
  for (const phrase of COMMON_PHRASES) {
    if (normalizedText.includes(phrase.phrase) && !seenRefs.has(phrase.reference)) {
      matches.push(phrase);
      seenRefs.add(phrase.reference);
    }
  }
  
  return matches;
}
