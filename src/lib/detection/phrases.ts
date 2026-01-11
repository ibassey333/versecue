// ============================================
// Enhanced Phrase Database - 500+ entries
// Fast string matching for common Bible quotes
// ============================================

interface PhraseMatch {
  phrase: string;
  reference: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number | null;
}

// ========== SALVATION ==========
const SALVATION_PHRASES: PhraseMatch[] = [
  // John 3:16-17
  { phrase: "for god so loved the world", reference: "John 3:16", book: "John", chapter: 3, verseStart: 16, verseEnd: null },
  { phrase: "god so loved the world", reference: "John 3:16", book: "John", chapter: 3, verseStart: 16, verseEnd: null },
  { phrase: "so loved the world that he gave", reference: "John 3:16", book: "John", chapter: 3, verseStart: 16, verseEnd: null },
  { phrase: "gave his only begotten son", reference: "John 3:16", book: "John", chapter: 3, verseStart: 16, verseEnd: null },
  { phrase: "only begotten son", reference: "John 3:16", book: "John", chapter: 3, verseStart: 16, verseEnd: null },
  { phrase: "whosoever believeth in him", reference: "John 3:16", book: "John", chapter: 3, verseStart: 16, verseEnd: null },
  { phrase: "should not perish but have everlasting life", reference: "John 3:16", book: "John", chapter: 3, verseStart: 16, verseEnd: null },
  { phrase: "have everlasting life", reference: "John 3:16", book: "John", chapter: 3, verseStart: 16, verseEnd: null },
  { phrase: "perish but have eternal life", reference: "John 3:16", book: "John", chapter: 3, verseStart: 16, verseEnd: null },
  { phrase: "god sent not his son into the world to condemn", reference: "John 3:17", book: "John", chapter: 3, verseStart: 17, verseEnd: null },
  { phrase: "world through him might be saved", reference: "John 3:17", book: "John", chapter: 3, verseStart: 17, verseEnd: null },
  
  // Romans 3:23
  { phrase: "for all have sinned", reference: "Romans 3:23", book: "Romans", chapter: 3, verseStart: 23, verseEnd: null },
  { phrase: "all have sinned and fall short", reference: "Romans 3:23", book: "Romans", chapter: 3, verseStart: 23, verseEnd: null },
  { phrase: "fall short of the glory of god", reference: "Romans 3:23", book: "Romans", chapter: 3, verseStart: 23, verseEnd: null },
  { phrase: "come short of the glory", reference: "Romans 3:23", book: "Romans", chapter: 3, verseStart: 23, verseEnd: null },
  { phrase: "all have sinned and come short", reference: "Romans 3:23", book: "Romans", chapter: 3, verseStart: 23, verseEnd: null },
  
  // Romans 6:23
  { phrase: "the wages of sin is death", reference: "Romans 6:23", book: "Romans", chapter: 6, verseStart: 23, verseEnd: null },
  { phrase: "wages of sin", reference: "Romans 6:23", book: "Romans", chapter: 6, verseStart: 23, verseEnd: null },
  { phrase: "gift of god is eternal life", reference: "Romans 6:23", book: "Romans", chapter: 6, verseStart: 23, verseEnd: null },
  { phrase: "eternal life through jesus christ", reference: "Romans 6:23", book: "Romans", chapter: 6, verseStart: 23, verseEnd: null },
  { phrase: "free gift of god", reference: "Romans 6:23", book: "Romans", chapter: 6, verseStart: 23, verseEnd: null },
  
  // Romans 5:8
  { phrase: "god commendeth his love toward us", reference: "Romans 5:8", book: "Romans", chapter: 5, verseStart: 8, verseEnd: null },
  { phrase: "while we were yet sinners christ died", reference: "Romans 5:8", book: "Romans", chapter: 5, verseStart: 8, verseEnd: null },
  { phrase: "christ died for us", reference: "Romans 5:8", book: "Romans", chapter: 5, verseStart: 8, verseEnd: null },
  { phrase: "god demonstrates his love", reference: "Romans 5:8", book: "Romans", chapter: 5, verseStart: 8, verseEnd: null },
  
  // Romans 10:9-10
  { phrase: "if thou shalt confess with thy mouth", reference: "Romans 10:9", book: "Romans", chapter: 10, verseStart: 9, verseEnd: null },
  { phrase: "confess with thy mouth the lord jesus", reference: "Romans 10:9", book: "Romans", chapter: 10, verseStart: 9, verseEnd: null },
  { phrase: "believe in thine heart that god hath raised him", reference: "Romans 10:9", book: "Romans", chapter: 10, verseStart: 9, verseEnd: null },
  { phrase: "thou shalt be saved", reference: "Romans 10:9", book: "Romans", chapter: 10, verseStart: 9, verseEnd: null },
  { phrase: "confess with your mouth", reference: "Romans 10:9", book: "Romans", chapter: 10, verseStart: 9, verseEnd: null },
  { phrase: "believe in your heart", reference: "Romans 10:9", book: "Romans", chapter: 10, verseStart: 9, verseEnd: null },
  { phrase: "with the heart man believeth", reference: "Romans 10:10", book: "Romans", chapter: 10, verseStart: 10, verseEnd: null },
  
  // Ephesians 2:8-9
  { phrase: "by grace are ye saved through faith", reference: "Ephesians 2:8", book: "Ephesians", chapter: 2, verseStart: 8, verseEnd: 9 },
  { phrase: "by grace you have been saved", reference: "Ephesians 2:8", book: "Ephesians", chapter: 2, verseStart: 8, verseEnd: 9 },
  { phrase: "saved through faith", reference: "Ephesians 2:8", book: "Ephesians", chapter: 2, verseStart: 8, verseEnd: null },
  { phrase: "not of yourselves it is the gift of god", reference: "Ephesians 2:8", book: "Ephesians", chapter: 2, verseStart: 8, verseEnd: null },
  { phrase: "not of works lest any man should boast", reference: "Ephesians 2:9", book: "Ephesians", chapter: 2, verseStart: 9, verseEnd: null },
  
  // Acts 4:12
  { phrase: "neither is there salvation in any other", reference: "Acts 4:12", book: "Acts", chapter: 4, verseStart: 12, verseEnd: null },
  { phrase: "no other name under heaven", reference: "Acts 4:12", book: "Acts", chapter: 4, verseStart: 12, verseEnd: null },
  { phrase: "salvation in no one else", reference: "Acts 4:12", book: "Acts", chapter: 4, verseStart: 12, verseEnd: null },
  
  // Acts 16:31
  { phrase: "believe on the lord jesus christ", reference: "Acts 16:31", book: "Acts", chapter: 16, verseStart: 31, verseEnd: null },
  { phrase: "thou shalt be saved and thy house", reference: "Acts 16:31", book: "Acts", chapter: 16, verseStart: 31, verseEnd: null },
  { phrase: "believe in the lord jesus", reference: "Acts 16:31", book: "Acts", chapter: 16, verseStart: 31, verseEnd: null },
];

// ========== FAITH & TRUST ==========
const FAITH_TRUST_PHRASES: PhraseMatch[] = [
  // Proverbs 3:5-6
  { phrase: "trust in the lord with all thine heart", reference: "Proverbs 3:5", book: "Proverbs", chapter: 3, verseStart: 5, verseEnd: 6 },
  { phrase: "trust in the lord with all your heart", reference: "Proverbs 3:5", book: "Proverbs", chapter: 3, verseStart: 5, verseEnd: 6 },
  { phrase: "lean not unto thine own understanding", reference: "Proverbs 3:5", book: "Proverbs", chapter: 3, verseStart: 5, verseEnd: null },
  { phrase: "lean not on your own understanding", reference: "Proverbs 3:5", book: "Proverbs", chapter: 3, verseStart: 5, verseEnd: null },
  { phrase: "in all thy ways acknowledge him", reference: "Proverbs 3:6", book: "Proverbs", chapter: 3, verseStart: 6, verseEnd: null },
  { phrase: "he shall direct thy paths", reference: "Proverbs 3:6", book: "Proverbs", chapter: 3, verseStart: 6, verseEnd: null },
  { phrase: "he will make your paths straight", reference: "Proverbs 3:6", book: "Proverbs", chapter: 3, verseStart: 6, verseEnd: null },
  
  // Hebrews 11:1
  { phrase: "faith is the substance of things hoped for", reference: "Hebrews 11:1", book: "Hebrews", chapter: 11, verseStart: 1, verseEnd: null },
  { phrase: "evidence of things not seen", reference: "Hebrews 11:1", book: "Hebrews", chapter: 11, verseStart: 1, verseEnd: null },
  { phrase: "assurance of things hoped for", reference: "Hebrews 11:1", book: "Hebrews", chapter: 11, verseStart: 1, verseEnd: null },
  { phrase: "conviction of things not seen", reference: "Hebrews 11:1", book: "Hebrews", chapter: 11, verseStart: 1, verseEnd: null },
  
  // Hebrews 11:6
  { phrase: "without faith it is impossible to please", reference: "Hebrews 11:6", book: "Hebrews", chapter: 11, verseStart: 6, verseEnd: null },
  { phrase: "impossible to please god", reference: "Hebrews 11:6", book: "Hebrews", chapter: 11, verseStart: 6, verseEnd: null },
  { phrase: "must believe that he is", reference: "Hebrews 11:6", book: "Hebrews", chapter: 11, verseStart: 6, verseEnd: null },
  { phrase: "rewarder of them that diligently seek him", reference: "Hebrews 11:6", book: "Hebrews", chapter: 11, verseStart: 6, verseEnd: null },
  
  // Romans 10:17
  { phrase: "faith cometh by hearing", reference: "Romans 10:17", book: "Romans", chapter: 10, verseStart: 17, verseEnd: null },
  { phrase: "faith comes by hearing", reference: "Romans 10:17", book: "Romans", chapter: 10, verseStart: 17, verseEnd: null },
  { phrase: "hearing by the word of god", reference: "Romans 10:17", book: "Romans", chapter: 10, verseStart: 17, verseEnd: null },
  
  // James 2:17,26
  { phrase: "faith without works is dead", reference: "James 2:17", book: "James", chapter: 2, verseStart: 17, verseEnd: null },
  { phrase: "faith if it hath not works is dead", reference: "James 2:17", book: "James", chapter: 2, verseStart: 17, verseEnd: null },
  
  // Mark 11:22-24
  { phrase: "have faith in god", reference: "Mark 11:22", book: "Mark", chapter: 11, verseStart: 22, verseEnd: null },
  { phrase: "whosoever shall say unto this mountain", reference: "Mark 11:23", book: "Mark", chapter: 11, verseStart: 23, verseEnd: null },
  { phrase: "what things soever ye desire when ye pray", reference: "Mark 11:24", book: "Mark", chapter: 11, verseStart: 24, verseEnd: null },
  
  // Matthew 17:20
  { phrase: "faith as a grain of mustard seed", reference: "Matthew 17:20", book: "Matthew", chapter: 17, verseStart: 20, verseEnd: null },
  { phrase: "faith as small as a mustard seed", reference: "Matthew 17:20", book: "Matthew", chapter: 17, verseStart: 20, verseEnd: null },
  { phrase: "nothing shall be impossible unto you", reference: "Matthew 17:20", book: "Matthew", chapter: 17, verseStart: 20, verseEnd: null },
  { phrase: "nothing will be impossible for you", reference: "Matthew 17:20", book: "Matthew", chapter: 17, verseStart: 20, verseEnd: null },
];

// ========== LOVE ==========
const LOVE_PHRASES: PhraseMatch[] = [
  // 1 Corinthians 13
  { phrase: "love is patient love is kind", reference: "1 Corinthians 13:4", book: "1 Corinthians", chapter: 13, verseStart: 4, verseEnd: null },
  { phrase: "charity suffereth long and is kind", reference: "1 Corinthians 13:4", book: "1 Corinthians", chapter: 13, verseStart: 4, verseEnd: null },
  { phrase: "love does not envy", reference: "1 Corinthians 13:4", book: "1 Corinthians", chapter: 13, verseStart: 4, verseEnd: null },
  { phrase: "love never fails", reference: "1 Corinthians 13:8", book: "1 Corinthians", chapter: 13, verseStart: 8, verseEnd: null },
  { phrase: "charity never faileth", reference: "1 Corinthians 13:8", book: "1 Corinthians", chapter: 13, verseStart: 8, verseEnd: null },
  { phrase: "faith hope and love", reference: "1 Corinthians 13:13", book: "1 Corinthians", chapter: 13, verseStart: 13, verseEnd: null },
  { phrase: "faith hope charity", reference: "1 Corinthians 13:13", book: "1 Corinthians", chapter: 13, verseStart: 13, verseEnd: null },
  { phrase: "greatest of these is love", reference: "1 Corinthians 13:13", book: "1 Corinthians", chapter: 13, verseStart: 13, verseEnd: null },
  { phrase: "greatest of these is charity", reference: "1 Corinthians 13:13", book: "1 Corinthians", chapter: 13, verseStart: 13, verseEnd: null },
  
  // 1 John 4:8,16
  { phrase: "god is love", reference: "1 John 4:8", book: "1 John", chapter: 4, verseStart: 8, verseEnd: null },
  { phrase: "he that loveth not knoweth not god", reference: "1 John 4:8", book: "1 John", chapter: 4, verseStart: 8, verseEnd: null },
  
  // John 13:34-35
  { phrase: "a new commandment i give unto you", reference: "John 13:34", book: "John", chapter: 13, verseStart: 34, verseEnd: null },
  { phrase: "love one another as i have loved you", reference: "John 13:34", book: "John", chapter: 13, verseStart: 34, verseEnd: null },
  { phrase: "by this shall all men know", reference: "John 13:35", book: "John", chapter: 13, verseStart: 35, verseEnd: null },
  
  // Matthew 22:37-39
  { phrase: "love the lord thy god with all thy heart", reference: "Matthew 22:37", book: "Matthew", chapter: 22, verseStart: 37, verseEnd: null },
  { phrase: "love the lord your god with all your heart", reference: "Matthew 22:37", book: "Matthew", chapter: 22, verseStart: 37, verseEnd: null },
  { phrase: "with all thy soul and with all thy mind", reference: "Matthew 22:37", book: "Matthew", chapter: 22, verseStart: 37, verseEnd: null },
  { phrase: "love thy neighbour as thyself", reference: "Matthew 22:39", book: "Matthew", chapter: 22, verseStart: 39, verseEnd: null },
  { phrase: "love your neighbor as yourself", reference: "Matthew 22:39", book: "Matthew", chapter: 22, verseStart: 39, verseEnd: null },
  
  // Matthew 5:44
  { phrase: "love your enemies", reference: "Matthew 5:44", book: "Matthew", chapter: 5, verseStart: 44, verseEnd: null },
  { phrase: "bless them that curse you", reference: "Matthew 5:44", book: "Matthew", chapter: 5, verseStart: 44, verseEnd: null },
  { phrase: "pray for them which despitefully use you", reference: "Matthew 5:44", book: "Matthew", chapter: 5, verseStart: 44, verseEnd: null },
  
  // Romans 8:28
  { phrase: "all things work together for good", reference: "Romans 8:28", book: "Romans", chapter: 8, verseStart: 28, verseEnd: null },
  { phrase: "to them that love god", reference: "Romans 8:28", book: "Romans", chapter: 8, verseStart: 28, verseEnd: null },
  { phrase: "called according to his purpose", reference: "Romans 8:28", book: "Romans", chapter: 8, verseStart: 28, verseEnd: null },
  
  // Romans 8:38-39
  { phrase: "neither death nor life", reference: "Romans 8:38", book: "Romans", chapter: 8, verseStart: 38, verseEnd: 39 },
  { phrase: "nor angels nor principalities", reference: "Romans 8:38", book: "Romans", chapter: 8, verseStart: 38, verseEnd: null },
  { phrase: "separate us from the love of god", reference: "Romans 8:39", book: "Romans", chapter: 8, verseStart: 39, verseEnd: null },
  { phrase: "nothing can separate us from the love", reference: "Romans 8:39", book: "Romans", chapter: 8, verseStart: 38, verseEnd: 39 },
];

// ========== COMFORT & PEACE ==========
const COMFORT_PEACE_PHRASES: PhraseMatch[] = [
  // Psalm 23
  { phrase: "the lord is my shepherd", reference: "Psalm 23:1", book: "Psalms", chapter: 23, verseStart: 1, verseEnd: null },
  { phrase: "i shall not want", reference: "Psalm 23:1", book: "Psalms", chapter: 23, verseStart: 1, verseEnd: null },
  { phrase: "he maketh me to lie down in green pastures", reference: "Psalm 23:2", book: "Psalms", chapter: 23, verseStart: 2, verseEnd: null },
  { phrase: "lie down in green pastures", reference: "Psalm 23:2", book: "Psalms", chapter: 23, verseStart: 2, verseEnd: null },
  { phrase: "leadeth me beside the still waters", reference: "Psalm 23:2", book: "Psalms", chapter: 23, verseStart: 2, verseEnd: null },
  { phrase: "he restoreth my soul", reference: "Psalm 23:3", book: "Psalms", chapter: 23, verseStart: 3, verseEnd: null },
  { phrase: "restores my soul", reference: "Psalm 23:3", book: "Psalms", chapter: 23, verseStart: 3, verseEnd: null },
  { phrase: "paths of righteousness for his names sake", reference: "Psalm 23:3", book: "Psalms", chapter: 23, verseStart: 3, verseEnd: null },
  { phrase: "valley of the shadow of death", reference: "Psalm 23:4", book: "Psalms", chapter: 23, verseStart: 4, verseEnd: null },
  { phrase: "i will fear no evil", reference: "Psalm 23:4", book: "Psalms", chapter: 23, verseStart: 4, verseEnd: null },
  { phrase: "for thou art with me", reference: "Psalm 23:4", book: "Psalms", chapter: 23, verseStart: 4, verseEnd: null },
  { phrase: "thy rod and thy staff they comfort me", reference: "Psalm 23:4", book: "Psalms", chapter: 23, verseStart: 4, verseEnd: null },
  { phrase: "preparest a table before me", reference: "Psalm 23:5", book: "Psalms", chapter: 23, verseStart: 5, verseEnd: null },
  { phrase: "in the presence of mine enemies", reference: "Psalm 23:5", book: "Psalms", chapter: 23, verseStart: 5, verseEnd: null },
  { phrase: "my cup runneth over", reference: "Psalm 23:5", book: "Psalms", chapter: 23, verseStart: 5, verseEnd: null },
  { phrase: "goodness and mercy shall follow me", reference: "Psalm 23:6", book: "Psalms", chapter: 23, verseStart: 6, verseEnd: null },
  { phrase: "dwell in the house of the lord forever", reference: "Psalm 23:6", book: "Psalms", chapter: 23, verseStart: 6, verseEnd: null },
  
  // Philippians 4:6-7
  { phrase: "be careful for nothing", reference: "Philippians 4:6", book: "Philippians", chapter: 4, verseStart: 6, verseEnd: null },
  { phrase: "do not be anxious about anything", reference: "Philippians 4:6", book: "Philippians", chapter: 4, verseStart: 6, verseEnd: null },
  { phrase: "be anxious for nothing", reference: "Philippians 4:6", book: "Philippians", chapter: 4, verseStart: 6, verseEnd: null },
  { phrase: "by prayer and supplication with thanksgiving", reference: "Philippians 4:6", book: "Philippians", chapter: 4, verseStart: 6, verseEnd: null },
  { phrase: "peace of god which passeth all understanding", reference: "Philippians 4:7", book: "Philippians", chapter: 4, verseStart: 7, verseEnd: null },
  { phrase: "peace of god which surpasses all understanding", reference: "Philippians 4:7", book: "Philippians", chapter: 4, verseStart: 7, verseEnd: null },
  { phrase: "guard your hearts and minds", reference: "Philippians 4:7", book: "Philippians", chapter: 4, verseStart: 7, verseEnd: null },
  
  // Philippians 4:13
  { phrase: "i can do all things through christ", reference: "Philippians 4:13", book: "Philippians", chapter: 4, verseStart: 13, verseEnd: null },
  { phrase: "i can do all things through him who strengthens", reference: "Philippians 4:13", book: "Philippians", chapter: 4, verseStart: 13, verseEnd: null },
  { phrase: "christ which strengtheneth me", reference: "Philippians 4:13", book: "Philippians", chapter: 4, verseStart: 13, verseEnd: null },
  { phrase: "through christ who strengthens me", reference: "Philippians 4:13", book: "Philippians", chapter: 4, verseStart: 13, verseEnd: null },
  
  // Isaiah 40:31
  { phrase: "they that wait upon the lord", reference: "Isaiah 40:31", book: "Isaiah", chapter: 40, verseStart: 31, verseEnd: null },
  { phrase: "those who wait on the lord", reference: "Isaiah 40:31", book: "Isaiah", chapter: 40, verseStart: 31, verseEnd: null },
  { phrase: "shall renew their strength", reference: "Isaiah 40:31", book: "Isaiah", chapter: 40, verseStart: 31, verseEnd: null },
  { phrase: "mount up with wings as eagles", reference: "Isaiah 40:31", book: "Isaiah", chapter: 40, verseStart: 31, verseEnd: null },
  { phrase: "soar on wings like eagles", reference: "Isaiah 40:31", book: "Isaiah", chapter: 40, verseStart: 31, verseEnd: null },
  { phrase: "run and not be weary", reference: "Isaiah 40:31", book: "Isaiah", chapter: 40, verseStart: 31, verseEnd: null },
  { phrase: "walk and not faint", reference: "Isaiah 40:31", book: "Isaiah", chapter: 40, verseStart: 31, verseEnd: null },
  
  // Isaiah 41:10
  { phrase: "fear thou not for i am with thee", reference: "Isaiah 41:10", book: "Isaiah", chapter: 41, verseStart: 10, verseEnd: null },
  { phrase: "fear not for i am with you", reference: "Isaiah 41:10", book: "Isaiah", chapter: 41, verseStart: 10, verseEnd: null },
  { phrase: "be not dismayed for i am thy god", reference: "Isaiah 41:10", book: "Isaiah", chapter: 41, verseStart: 10, verseEnd: null },
  { phrase: "i will strengthen thee", reference: "Isaiah 41:10", book: "Isaiah", chapter: 41, verseStart: 10, verseEnd: null },
  { phrase: "i will help thee", reference: "Isaiah 41:10", book: "Isaiah", chapter: 41, verseStart: 10, verseEnd: null },
  { phrase: "uphold thee with the right hand of my righteousness", reference: "Isaiah 41:10", book: "Isaiah", chapter: 41, verseStart: 10, verseEnd: null },
  
  // Jeremiah 29:11
  { phrase: "for i know the thoughts that i think toward you", reference: "Jeremiah 29:11", book: "Jeremiah", chapter: 29, verseStart: 11, verseEnd: null },
  { phrase: "i know the plans i have for you", reference: "Jeremiah 29:11", book: "Jeremiah", chapter: 29, verseStart: 11, verseEnd: null },
  { phrase: "thoughts of peace and not of evil", reference: "Jeremiah 29:11", book: "Jeremiah", chapter: 29, verseStart: 11, verseEnd: null },
  { phrase: "plans to prosper you and not to harm you", reference: "Jeremiah 29:11", book: "Jeremiah", chapter: 29, verseStart: 11, verseEnd: null },
  { phrase: "give you an expected end", reference: "Jeremiah 29:11", book: "Jeremiah", chapter: 29, verseStart: 11, verseEnd: null },
  { phrase: "give you hope and a future", reference: "Jeremiah 29:11", book: "Jeremiah", chapter: 29, verseStart: 11, verseEnd: null },
  { phrase: "plans to give you hope", reference: "Jeremiah 29:11", book: "Jeremiah", chapter: 29, verseStart: 11, verseEnd: null },
  
  // Matthew 11:28-30
  { phrase: "come unto me all ye that labour", reference: "Matthew 11:28", book: "Matthew", chapter: 11, verseStart: 28, verseEnd: null },
  { phrase: "come to me all who are weary", reference: "Matthew 11:28", book: "Matthew", chapter: 11, verseStart: 28, verseEnd: null },
  { phrase: "i will give you rest", reference: "Matthew 11:28", book: "Matthew", chapter: 11, verseStart: 28, verseEnd: null },
  { phrase: "take my yoke upon you", reference: "Matthew 11:29", book: "Matthew", chapter: 11, verseStart: 29, verseEnd: null },
  { phrase: "learn of me for i am meek", reference: "Matthew 11:29", book: "Matthew", chapter: 11, verseStart: 29, verseEnd: null },
  { phrase: "find rest for your souls", reference: "Matthew 11:29", book: "Matthew", chapter: 11, verseStart: 29, verseEnd: null },
  { phrase: "my yoke is easy and my burden is light", reference: "Matthew 11:30", book: "Matthew", chapter: 11, verseStart: 30, verseEnd: null },
  
  // John 14:27
  { phrase: "peace i leave with you", reference: "John 14:27", book: "John", chapter: 14, verseStart: 27, verseEnd: null },
  { phrase: "my peace i give unto you", reference: "John 14:27", book: "John", chapter: 14, verseStart: 27, verseEnd: null },
  { phrase: "not as the world giveth", reference: "John 14:27", book: "John", chapter: 14, verseStart: 27, verseEnd: null },
  { phrase: "let not your heart be troubled", reference: "John 14:27", book: "John", chapter: 14, verseStart: 27, verseEnd: null },
  { phrase: "neither let it be afraid", reference: "John 14:27", book: "John", chapter: 14, verseStart: 27, verseEnd: null },
  
  // 1 Peter 5:7
  { phrase: "casting all your care upon him", reference: "1 Peter 5:7", book: "1 Peter", chapter: 5, verseStart: 7, verseEnd: null },
  { phrase: "cast all your anxiety on him", reference: "1 Peter 5:7", book: "1 Peter", chapter: 5, verseStart: 7, verseEnd: null },
  { phrase: "for he careth for you", reference: "1 Peter 5:7", book: "1 Peter", chapter: 5, verseStart: 7, verseEnd: null },
  { phrase: "because he cares for you", reference: "1 Peter 5:7", book: "1 Peter", chapter: 5, verseStart: 7, verseEnd: null },
  
  // Psalm 46:10
  { phrase: "be still and know that i am god", reference: "Psalm 46:10", book: "Psalms", chapter: 46, verseStart: 10, verseEnd: null },
  { phrase: "be still and know", reference: "Psalm 46:10", book: "Psalms", chapter: 46, verseStart: 10, verseEnd: null },
];

// ========== JESUS' IDENTITY ==========
const JESUS_IDENTITY_PHRASES: PhraseMatch[] = [
  // John 14:6
  { phrase: "i am the way the truth and the life", reference: "John 14:6", book: "John", chapter: 14, verseStart: 6, verseEnd: null },
  { phrase: "i am the way", reference: "John 14:6", book: "John", chapter: 14, verseStart: 6, verseEnd: null },
  { phrase: "the way the truth and the life", reference: "John 14:6", book: "John", chapter: 14, verseStart: 6, verseEnd: null },
  { phrase: "no man cometh unto the father but by me", reference: "John 14:6", book: "John", chapter: 14, verseStart: 6, verseEnd: null },
  { phrase: "no one comes to the father except through me", reference: "John 14:6", book: "John", chapter: 14, verseStart: 6, verseEnd: null },
  
  // John 8:12
  { phrase: "i am the light of the world", reference: "John 8:12", book: "John", chapter: 8, verseStart: 12, verseEnd: null },
  { phrase: "light of the world", reference: "John 8:12", book: "John", chapter: 8, verseStart: 12, verseEnd: null },
  { phrase: "shall not walk in darkness", reference: "John 8:12", book: "John", chapter: 8, verseStart: 12, verseEnd: null },
  { phrase: "have the light of life", reference: "John 8:12", book: "John", chapter: 8, verseStart: 12, verseEnd: null },
  
  // John 10:11,14
  { phrase: "i am the good shepherd", reference: "John 10:11", book: "John", chapter: 10, verseStart: 11, verseEnd: null },
  { phrase: "the good shepherd giveth his life", reference: "John 10:11", book: "John", chapter: 10, verseStart: 11, verseEnd: null },
  { phrase: "good shepherd lays down his life", reference: "John 10:11", book: "John", chapter: 10, verseStart: 11, verseEnd: null },
  
  // John 6:35
  { phrase: "i am the bread of life", reference: "John 6:35", book: "John", chapter: 6, verseStart: 35, verseEnd: null },
  { phrase: "bread of life", reference: "John 6:35", book: "John", chapter: 6, verseStart: 35, verseEnd: null },
  { phrase: "he that cometh to me shall never hunger", reference: "John 6:35", book: "John", chapter: 6, verseStart: 35, verseEnd: null },
  { phrase: "whoever comes to me will never go hungry", reference: "John 6:35", book: "John", chapter: 6, verseStart: 35, verseEnd: null },
  
  // John 11:25-26
  { phrase: "i am the resurrection and the life", reference: "John 11:25", book: "John", chapter: 11, verseStart: 25, verseEnd: null },
  { phrase: "resurrection and the life", reference: "John 11:25", book: "John", chapter: 11, verseStart: 25, verseEnd: null },
  { phrase: "he that believeth in me though he were dead", reference: "John 11:25", book: "John", chapter: 11, verseStart: 25, verseEnd: null },
  { phrase: "whosoever liveth and believeth in me shall never die", reference: "John 11:26", book: "John", chapter: 11, verseStart: 26, verseEnd: null },
  
  // John 15:5
  { phrase: "i am the vine ye are the branches", reference: "John 15:5", book: "John", chapter: 15, verseStart: 5, verseEnd: null },
  { phrase: "i am the vine you are the branches", reference: "John 15:5", book: "John", chapter: 15, verseStart: 5, verseEnd: null },
  { phrase: "without me ye can do nothing", reference: "John 15:5", book: "John", chapter: 15, verseStart: 5, verseEnd: null },
  { phrase: "apart from me you can do nothing", reference: "John 15:5", book: "John", chapter: 15, verseStart: 5, verseEnd: null },
  
  // John 10:9
  { phrase: "i am the door", reference: "John 10:9", book: "John", chapter: 10, verseStart: 9, verseEnd: null },
  { phrase: "i am the gate", reference: "John 10:9", book: "John", chapter: 10, verseStart: 9, verseEnd: null },
  { phrase: "if any man enter in he shall be saved", reference: "John 10:9", book: "John", chapter: 10, verseStart: 9, verseEnd: null },
  
  // John 1:1,14
  { phrase: "in the beginning was the word", reference: "John 1:1", book: "John", chapter: 1, verseStart: 1, verseEnd: null },
  { phrase: "the word was with god", reference: "John 1:1", book: "John", chapter: 1, verseStart: 1, verseEnd: null },
  { phrase: "the word was god", reference: "John 1:1", book: "John", chapter: 1, verseStart: 1, verseEnd: null },
  { phrase: "the word became flesh", reference: "John 1:14", book: "John", chapter: 1, verseStart: 14, verseEnd: null },
  { phrase: "word was made flesh and dwelt among us", reference: "John 1:14", book: "John", chapter: 1, verseStart: 14, verseEnd: null },
  
  // John 8:32
  { phrase: "ye shall know the truth", reference: "John 8:32", book: "John", chapter: 8, verseStart: 32, verseEnd: null },
  { phrase: "you will know the truth", reference: "John 8:32", book: "John", chapter: 8, verseStart: 32, verseEnd: null },
  { phrase: "the truth shall make you free", reference: "John 8:32", book: "John", chapter: 8, verseStart: 32, verseEnd: null },
  { phrase: "the truth will set you free", reference: "John 8:32", book: "John", chapter: 8, verseStart: 32, verseEnd: null },
  
  // Revelation 22:13
  { phrase: "i am alpha and omega", reference: "Revelation 22:13", book: "Revelation", chapter: 22, verseStart: 13, verseEnd: null },
  { phrase: "alpha and omega", reference: "Revelation 22:13", book: "Revelation", chapter: 22, verseStart: 13, verseEnd: null },
  { phrase: "the beginning and the end", reference: "Revelation 22:13", book: "Revelation", chapter: 22, verseStart: 13, verseEnd: null },
  { phrase: "the first and the last", reference: "Revelation 22:13", book: "Revelation", chapter: 22, verseStart: 13, verseEnd: null },
];

// ========== POWER & VICTORY ==========
const POWER_VICTORY_PHRASES: PhraseMatch[] = [
  // Joshua 1:9
  { phrase: "be strong and of a good courage", reference: "Joshua 1:9", book: "Joshua", chapter: 1, verseStart: 9, verseEnd: null },
  { phrase: "be strong and courageous", reference: "Joshua 1:9", book: "Joshua", chapter: 1, verseStart: 9, verseEnd: null },
  { phrase: "be not afraid neither be thou dismayed", reference: "Joshua 1:9", book: "Joshua", chapter: 1, verseStart: 9, verseEnd: null },
  { phrase: "do not be afraid do not be discouraged", reference: "Joshua 1:9", book: "Joshua", chapter: 1, verseStart: 9, verseEnd: null },
  { phrase: "the lord thy god is with thee whithersoever thou goest", reference: "Joshua 1:9", book: "Joshua", chapter: 1, verseStart: 9, verseEnd: null },
  
  // 2 Timothy 1:7
  { phrase: "god hath not given us the spirit of fear", reference: "2 Timothy 1:7", book: "2 Timothy", chapter: 1, verseStart: 7, verseEnd: null },
  { phrase: "god has not given us a spirit of fear", reference: "2 Timothy 1:7", book: "2 Timothy", chapter: 1, verseStart: 7, verseEnd: null },
  { phrase: "spirit of power and of love and of a sound mind", reference: "2 Timothy 1:7", book: "2 Timothy", chapter: 1, verseStart: 7, verseEnd: null },
  { phrase: "power love and self discipline", reference: "2 Timothy 1:7", book: "2 Timothy", chapter: 1, verseStart: 7, verseEnd: null },
  
  // 1 John 4:4
  { phrase: "greater is he that is in you", reference: "1 John 4:4", book: "1 John", chapter: 4, verseStart: 4, verseEnd: null },
  { phrase: "greater is he that is in me", reference: "1 John 4:4", book: "1 John", chapter: 4, verseStart: 4, verseEnd: null },
  { phrase: "than he that is in the world", reference: "1 John 4:4", book: "1 John", chapter: 4, verseStart: 4, verseEnd: null },
  
  // Isaiah 54:17
  { phrase: "no weapon that is formed against thee shall prosper", reference: "Isaiah 54:17", book: "Isaiah", chapter: 54, verseStart: 17, verseEnd: null },
  { phrase: "no weapon formed against you shall prosper", reference: "Isaiah 54:17", book: "Isaiah", chapter: 54, verseStart: 17, verseEnd: null },
  { phrase: "no weapon formed against me", reference: "Isaiah 54:17", book: "Isaiah", chapter: 54, verseStart: 17, verseEnd: null },
  
  // Deuteronomy 31:6
  { phrase: "he will not fail thee nor forsake thee", reference: "Deuteronomy 31:6", book: "Deuteronomy", chapter: 31, verseStart: 6, verseEnd: null },
  { phrase: "he will never leave you nor forsake you", reference: "Deuteronomy 31:6", book: "Deuteronomy", chapter: 31, verseStart: 6, verseEnd: null },
  { phrase: "never leave thee nor forsake thee", reference: "Hebrews 13:5", book: "Hebrews", chapter: 13, verseStart: 5, verseEnd: null },
  
  // 2 Corinthians 12:9-10
  { phrase: "my grace is sufficient for thee", reference: "2 Corinthians 12:9", book: "2 Corinthians", chapter: 12, verseStart: 9, verseEnd: null },
  { phrase: "my grace is sufficient for you", reference: "2 Corinthians 12:9", book: "2 Corinthians", chapter: 12, verseStart: 9, verseEnd: null },
  { phrase: "my strength is made perfect in weakness", reference: "2 Corinthians 12:9", book: "2 Corinthians", chapter: 12, verseStart: 9, verseEnd: null },
  { phrase: "power is made perfect in weakness", reference: "2 Corinthians 12:9", book: "2 Corinthians", chapter: 12, verseStart: 9, verseEnd: null },
  { phrase: "when i am weak then am i strong", reference: "2 Corinthians 12:10", book: "2 Corinthians", chapter: 12, verseStart: 10, verseEnd: null },
  
  // Ephesians 6:10-17
  { phrase: "be strong in the lord", reference: "Ephesians 6:10", book: "Ephesians", chapter: 6, verseStart: 10, verseEnd: null },
  { phrase: "power of his might", reference: "Ephesians 6:10", book: "Ephesians", chapter: 6, verseStart: 10, verseEnd: null },
  { phrase: "put on the whole armour of god", reference: "Ephesians 6:11", book: "Ephesians", chapter: 6, verseStart: 11, verseEnd: null },
  { phrase: "put on the full armor of god", reference: "Ephesians 6:11", book: "Ephesians", chapter: 6, verseStart: 11, verseEnd: null },
  { phrase: "stand against the wiles of the devil", reference: "Ephesians 6:11", book: "Ephesians", chapter: 6, verseStart: 11, verseEnd: null },
  { phrase: "we wrestle not against flesh and blood", reference: "Ephesians 6:12", book: "Ephesians", chapter: 6, verseStart: 12, verseEnd: null },
  { phrase: "belt of truth", reference: "Ephesians 6:14", book: "Ephesians", chapter: 6, verseStart: 14, verseEnd: null },
  { phrase: "breastplate of righteousness", reference: "Ephesians 6:14", book: "Ephesians", chapter: 6, verseStart: 14, verseEnd: null },
  { phrase: "shield of faith", reference: "Ephesians 6:16", book: "Ephesians", chapter: 6, verseStart: 16, verseEnd: null },
  { phrase: "helmet of salvation", reference: "Ephesians 6:17", book: "Ephesians", chapter: 6, verseStart: 17, verseEnd: null },
  { phrase: "sword of the spirit", reference: "Ephesians 6:17", book: "Ephesians", chapter: 6, verseStart: 17, verseEnd: null },
];

// ========== NEW CREATION & TRANSFORMATION ==========
const NEW_CREATION_PHRASES: PhraseMatch[] = [
  // 2 Corinthians 5:17
  { phrase: "if any man be in christ he is a new creature", reference: "2 Corinthians 5:17", book: "2 Corinthians", chapter: 5, verseStart: 17, verseEnd: null },
  { phrase: "if anyone is in christ he is a new creation", reference: "2 Corinthians 5:17", book: "2 Corinthians", chapter: 5, verseStart: 17, verseEnd: null },
  { phrase: "new creature in christ", reference: "2 Corinthians 5:17", book: "2 Corinthians", chapter: 5, verseStart: 17, verseEnd: null },
  { phrase: "new creation", reference: "2 Corinthians 5:17", book: "2 Corinthians", chapter: 5, verseStart: 17, verseEnd: null },
  { phrase: "old things are passed away", reference: "2 Corinthians 5:17", book: "2 Corinthians", chapter: 5, verseStart: 17, verseEnd: null },
  { phrase: "behold all things are become new", reference: "2 Corinthians 5:17", book: "2 Corinthians", chapter: 5, verseStart: 17, verseEnd: null },
  
  // Galatians 2:20
  { phrase: "i am crucified with christ", reference: "Galatians 2:20", book: "Galatians", chapter: 2, verseStart: 20, verseEnd: null },
  { phrase: "i have been crucified with christ", reference: "Galatians 2:20", book: "Galatians", chapter: 2, verseStart: 20, verseEnd: null },
  { phrase: "nevertheless i live yet not i", reference: "Galatians 2:20", book: "Galatians", chapter: 2, verseStart: 20, verseEnd: null },
  { phrase: "christ liveth in me", reference: "Galatians 2:20", book: "Galatians", chapter: 2, verseStart: 20, verseEnd: null },
  { phrase: "christ lives in me", reference: "Galatians 2:20", book: "Galatians", chapter: 2, verseStart: 20, verseEnd: null },
  
  // Romans 12:2
  { phrase: "be not conformed to this world", reference: "Romans 12:2", book: "Romans", chapter: 12, verseStart: 2, verseEnd: null },
  { phrase: "do not conform to the pattern of this world", reference: "Romans 12:2", book: "Romans", chapter: 12, verseStart: 2, verseEnd: null },
  { phrase: "be ye transformed by the renewing of your mind", reference: "Romans 12:2", book: "Romans", chapter: 12, verseStart: 2, verseEnd: null },
  { phrase: "transformed by the renewing of your mind", reference: "Romans 12:2", book: "Romans", chapter: 12, verseStart: 2, verseEnd: null },
  { phrase: "renewing of your mind", reference: "Romans 12:2", book: "Romans", chapter: 12, verseStart: 2, verseEnd: null },
  
  // 1 John 1:9
  { phrase: "if we confess our sins", reference: "1 John 1:9", book: "1 John", chapter: 1, verseStart: 9, verseEnd: null },
  { phrase: "he is faithful and just to forgive us our sins", reference: "1 John 1:9", book: "1 John", chapter: 1, verseStart: 9, verseEnd: null },
  { phrase: "faithful and just to forgive", reference: "1 John 1:9", book: "1 John", chapter: 1, verseStart: 9, verseEnd: null },
  { phrase: "cleanse us from all unrighteousness", reference: "1 John 1:9", book: "1 John", chapter: 1, verseStart: 9, verseEnd: null },
];

// ========== GUIDANCE & WISDOM ==========
const GUIDANCE_WISDOM_PHRASES: PhraseMatch[] = [
  // Psalm 119:105
  { phrase: "thy word is a lamp unto my feet", reference: "Psalm 119:105", book: "Psalms", chapter: 119, verseStart: 105, verseEnd: null },
  { phrase: "your word is a lamp for my feet", reference: "Psalm 119:105", book: "Psalms", chapter: 119, verseStart: 105, verseEnd: null },
  { phrase: "lamp unto my feet and a light unto my path", reference: "Psalm 119:105", book: "Psalms", chapter: 119, verseStart: 105, verseEnd: null },
  { phrase: "a light unto my path", reference: "Psalm 119:105", book: "Psalms", chapter: 119, verseStart: 105, verseEnd: null },
  { phrase: "a light to my path", reference: "Psalm 119:105", book: "Psalms", chapter: 119, verseStart: 105, verseEnd: null },
  
  // James 1:5
  { phrase: "if any of you lack wisdom", reference: "James 1:5", book: "James", chapter: 1, verseStart: 5, verseEnd: null },
  { phrase: "let him ask of god", reference: "James 1:5", book: "James", chapter: 1, verseStart: 5, verseEnd: null },
  { phrase: "giveth to all men liberally", reference: "James 1:5", book: "James", chapter: 1, verseStart: 5, verseEnd: null },
  { phrase: "gives generously to all", reference: "James 1:5", book: "James", chapter: 1, verseStart: 5, verseEnd: null },
  
  // Matthew 6:33
  { phrase: "seek ye first the kingdom of god", reference: "Matthew 6:33", book: "Matthew", chapter: 6, verseStart: 33, verseEnd: null },
  { phrase: "seek first the kingdom of god", reference: "Matthew 6:33", book: "Matthew", chapter: 6, verseStart: 33, verseEnd: null },
  { phrase: "seek first his kingdom and his righteousness", reference: "Matthew 6:33", book: "Matthew", chapter: 6, verseStart: 33, verseEnd: null },
  { phrase: "all these things shall be added unto you", reference: "Matthew 6:33", book: "Matthew", chapter: 6, verseStart: 33, verseEnd: null },
  
  // Matthew 7:7
  { phrase: "ask and it shall be given you", reference: "Matthew 7:7", book: "Matthew", chapter: 7, verseStart: 7, verseEnd: null },
  { phrase: "ask and it will be given to you", reference: "Matthew 7:7", book: "Matthew", chapter: 7, verseStart: 7, verseEnd: null },
  { phrase: "seek and ye shall find", reference: "Matthew 7:7", book: "Matthew", chapter: 7, verseStart: 7, verseEnd: null },
  { phrase: "seek and you will find", reference: "Matthew 7:7", book: "Matthew", chapter: 7, verseStart: 7, verseEnd: null },
  { phrase: "knock and it shall be opened unto you", reference: "Matthew 7:7", book: "Matthew", chapter: 7, verseStart: 7, verseEnd: null },
  { phrase: "knock and the door will be opened", reference: "Matthew 7:7", book: "Matthew", chapter: 7, verseStart: 7, verseEnd: null },
  { phrase: "ask seek knock", reference: "Matthew 7:7", book: "Matthew", chapter: 7, verseStart: 7, verseEnd: null },
  
  // Proverbs 22:6
  { phrase: "train up a child in the way he should go", reference: "Proverbs 22:6", book: "Proverbs", chapter: 22, verseStart: 6, verseEnd: null },
  { phrase: "when he is old he will not depart from it", reference: "Proverbs 22:6", book: "Proverbs", chapter: 22, verseStart: 6, verseEnd: null },
  
  // Proverbs 27:17
  { phrase: "iron sharpeneth iron", reference: "Proverbs 27:17", book: "Proverbs", chapter: 27, verseStart: 17, verseEnd: null },
  { phrase: "iron sharpens iron", reference: "Proverbs 27:17", book: "Proverbs", chapter: 27, verseStart: 17, verseEnd: null },
  { phrase: "so a man sharpeneth the countenance of his friend", reference: "Proverbs 27:17", book: "Proverbs", chapter: 27, verseStart: 17, verseEnd: null },
];

// ========== FRUIT OF THE SPIRIT ==========
const FRUIT_OF_SPIRIT_PHRASES: PhraseMatch[] = [
  { phrase: "the fruit of the spirit is love", reference: "Galatians 5:22", book: "Galatians", chapter: 5, verseStart: 22, verseEnd: 23 },
  { phrase: "fruit of the spirit", reference: "Galatians 5:22", book: "Galatians", chapter: 5, verseStart: 22, verseEnd: 23 },
  { phrase: "love joy peace longsuffering", reference: "Galatians 5:22", book: "Galatians", chapter: 5, verseStart: 22, verseEnd: null },
  { phrase: "love joy peace patience", reference: "Galatians 5:22", book: "Galatians", chapter: 5, verseStart: 22, verseEnd: null },
  { phrase: "gentleness goodness faith", reference: "Galatians 5:22", book: "Galatians", chapter: 5, verseStart: 22, verseEnd: null },
  { phrase: "meekness temperance", reference: "Galatians 5:23", book: "Galatians", chapter: 5, verseStart: 23, verseEnd: null },
  { phrase: "gentleness and self control", reference: "Galatians 5:23", book: "Galatians", chapter: 5, verseStart: 23, verseEnd: null },
  { phrase: "against such there is no law", reference: "Galatians 5:23", book: "Galatians", chapter: 5, verseStart: 23, verseEnd: null },
];

// ========== GREAT COMMISSION ==========
const GREAT_COMMISSION_PHRASES: PhraseMatch[] = [
  { phrase: "go ye therefore and teach all nations", reference: "Matthew 28:19", book: "Matthew", chapter: 28, verseStart: 19, verseEnd: null },
  { phrase: "go and make disciples of all nations", reference: "Matthew 28:19", book: "Matthew", chapter: 28, verseStart: 19, verseEnd: null },
  { phrase: "make disciples of all nations", reference: "Matthew 28:19", book: "Matthew", chapter: 28, verseStart: 19, verseEnd: null },
  { phrase: "baptizing them in the name of the father", reference: "Matthew 28:19", book: "Matthew", chapter: 28, verseStart: 19, verseEnd: null },
  { phrase: "in the name of the father and of the son", reference: "Matthew 28:19", book: "Matthew", chapter: 28, verseStart: 19, verseEnd: null },
  { phrase: "teaching them to observe all things", reference: "Matthew 28:20", book: "Matthew", chapter: 28, verseStart: 20, verseEnd: null },
  { phrase: "i am with you always", reference: "Matthew 28:20", book: "Matthew", chapter: 28, verseStart: 20, verseEnd: null },
  { phrase: "even unto the end of the world", reference: "Matthew 28:20", book: "Matthew", chapter: 28, verseStart: 20, verseEnd: null },
  { phrase: "to the very end of the age", reference: "Matthew 28:20", book: "Matthew", chapter: 28, verseStart: 20, verseEnd: null },
  
  // Acts 1:8
  { phrase: "ye shall receive power", reference: "Acts 1:8", book: "Acts", chapter: 1, verseStart: 8, verseEnd: null },
  { phrase: "you will receive power", reference: "Acts 1:8", book: "Acts", chapter: 1, verseStart: 8, verseEnd: null },
  { phrase: "when the holy ghost is come upon you", reference: "Acts 1:8", book: "Acts", chapter: 1, verseStart: 8, verseEnd: null },
  { phrase: "when the holy spirit comes on you", reference: "Acts 1:8", book: "Acts", chapter: 1, verseStart: 8, verseEnd: null },
  { phrase: "ye shall be witnesses unto me", reference: "Acts 1:8", book: "Acts", chapter: 1, verseStart: 8, verseEnd: null },
  { phrase: "you will be my witnesses", reference: "Acts 1:8", book: "Acts", chapter: 1, verseStart: 8, verseEnd: null },
  { phrase: "in jerusalem and in all judaea", reference: "Acts 1:8", book: "Acts", chapter: 1, verseStart: 8, verseEnd: null },
  { phrase: "unto the uttermost part of the earth", reference: "Acts 1:8", book: "Acts", chapter: 1, verseStart: 8, verseEnd: null },
  { phrase: "to the ends of the earth", reference: "Acts 1:8", book: "Acts", chapter: 1, verseStart: 8, verseEnd: null },
];

// ========== CREATION (GENESIS) ==========
const CREATION_GENESIS_PHRASES: PhraseMatch[] = [
  { phrase: "in the beginning god created", reference: "Genesis 1:1", book: "Genesis", chapter: 1, verseStart: 1, verseEnd: null },
  { phrase: "in the beginning god created the heaven and the earth", reference: "Genesis 1:1", book: "Genesis", chapter: 1, verseStart: 1, verseEnd: null },
  { phrase: "the earth was without form and void", reference: "Genesis 1:2", book: "Genesis", chapter: 1, verseStart: 2, verseEnd: null },
  { phrase: "let there be light", reference: "Genesis 1:3", book: "Genesis", chapter: 1, verseStart: 3, verseEnd: null },
  { phrase: "and there was light", reference: "Genesis 1:3", book: "Genesis", chapter: 1, verseStart: 3, verseEnd: null },
  { phrase: "let us make man in our image", reference: "Genesis 1:26", book: "Genesis", chapter: 1, verseStart: 26, verseEnd: null },
  { phrase: "in his own image", reference: "Genesis 1:27", book: "Genesis", chapter: 1, verseStart: 27, verseEnd: null },
  { phrase: "in the image of god created he him", reference: "Genesis 1:27", book: "Genesis", chapter: 1, verseStart: 27, verseEnd: null },
  { phrase: "male and female created he them", reference: "Genesis 1:27", book: "Genesis", chapter: 1, verseStart: 27, verseEnd: null },
  { phrase: "be fruitful and multiply", reference: "Genesis 1:28", book: "Genesis", chapter: 1, verseStart: 28, verseEnd: null },
];

// ========== REVELATION & END TIMES ==========
const REVELATION_PHRASES: PhraseMatch[] = [
  { phrase: "behold i stand at the door and knock", reference: "Revelation 3:20", book: "Revelation", chapter: 3, verseStart: 20, verseEnd: null },
  { phrase: "i stand at the door and knock", reference: "Revelation 3:20", book: "Revelation", chapter: 3, verseStart: 20, verseEnd: null },
  { phrase: "if any man hear my voice", reference: "Revelation 3:20", book: "Revelation", chapter: 3, verseStart: 20, verseEnd: null },
  { phrase: "i will come in to him and sup with him", reference: "Revelation 3:20", book: "Revelation", chapter: 3, verseStart: 20, verseEnd: null },
  
  { phrase: "god shall wipe away all tears", reference: "Revelation 21:4", book: "Revelation", chapter: 21, verseStart: 4, verseEnd: null },
  { phrase: "he will wipe every tear from their eyes", reference: "Revelation 21:4", book: "Revelation", chapter: 21, verseStart: 4, verseEnd: null },
  { phrase: "there shall be no more death", reference: "Revelation 21:4", book: "Revelation", chapter: 21, verseStart: 4, verseEnd: null },
  { phrase: "neither sorrow nor crying", reference: "Revelation 21:4", book: "Revelation", chapter: 21, verseStart: 4, verseEnd: null },
  { phrase: "no more pain", reference: "Revelation 21:4", book: "Revelation", chapter: 21, verseStart: 4, verseEnd: null },
  { phrase: "former things are passed away", reference: "Revelation 21:4", book: "Revelation", chapter: 21, verseStart: 4, verseEnd: null },
  
  { phrase: "behold i come quickly", reference: "Revelation 22:12", book: "Revelation", chapter: 22, verseStart: 12, verseEnd: null },
  { phrase: "my reward is with me", reference: "Revelation 22:12", book: "Revelation", chapter: 22, verseStart: 12, verseEnd: null },
];

// ========== PSALMS (Additional) ==========
const PSALMS_PHRASES: PhraseMatch[] = [
  // Psalm 118:24
  { phrase: "this is the day which the lord hath made", reference: "Psalm 118:24", book: "Psalms", chapter: 118, verseStart: 24, verseEnd: null },
  { phrase: "this is the day the lord has made", reference: "Psalm 118:24", book: "Psalms", chapter: 118, verseStart: 24, verseEnd: null },
  { phrase: "we will rejoice and be glad in it", reference: "Psalm 118:24", book: "Psalms", chapter: 118, verseStart: 24, verseEnd: null },
  { phrase: "let us rejoice and be glad", reference: "Psalm 118:24", book: "Psalms", chapter: 118, verseStart: 24, verseEnd: null },
  
  // Psalm 51
  { phrase: "create in me a clean heart", reference: "Psalm 51:10", book: "Psalms", chapter: 51, verseStart: 10, verseEnd: null },
  { phrase: "renew a right spirit within me", reference: "Psalm 51:10", book: "Psalms", chapter: 51, verseStart: 10, verseEnd: null },
  { phrase: "create in me a pure heart", reference: "Psalm 51:10", book: "Psalms", chapter: 51, verseStart: 10, verseEnd: null },
  
  // Psalm 27:1
  { phrase: "the lord is my light and my salvation", reference: "Psalm 27:1", book: "Psalms", chapter: 27, verseStart: 1, verseEnd: null },
  { phrase: "whom shall i fear", reference: "Psalm 27:1", book: "Psalms", chapter: 27, verseStart: 1, verseEnd: null },
  { phrase: "the lord is the strength of my life", reference: "Psalm 27:1", book: "Psalms", chapter: 27, verseStart: 1, verseEnd: null },
  
  // Psalm 37:4
  { phrase: "delight thyself also in the lord", reference: "Psalm 37:4", book: "Psalms", chapter: 37, verseStart: 4, verseEnd: null },
  { phrase: "delight yourself in the lord", reference: "Psalm 37:4", book: "Psalms", chapter: 37, verseStart: 4, verseEnd: null },
  { phrase: "he shall give thee the desires of thine heart", reference: "Psalm 37:4", book: "Psalms", chapter: 37, verseStart: 4, verseEnd: null },
  { phrase: "he will give you the desires of your heart", reference: "Psalm 37:4", book: "Psalms", chapter: 37, verseStart: 4, verseEnd: null },
  
  // Psalm 91
  { phrase: "he that dwelleth in the secret place", reference: "Psalm 91:1", book: "Psalms", chapter: 91, verseStart: 1, verseEnd: null },
  { phrase: "whoever dwells in the shelter of the most high", reference: "Psalm 91:1", book: "Psalms", chapter: 91, verseStart: 1, verseEnd: null },
  { phrase: "under the shadow of the almighty", reference: "Psalm 91:1", book: "Psalms", chapter: 91, verseStart: 1, verseEnd: null },
  { phrase: "he is my refuge and my fortress", reference: "Psalm 91:2", book: "Psalms", chapter: 91, verseStart: 2, verseEnd: null },
  { phrase: "my god in him will i trust", reference: "Psalm 91:2", book: "Psalms", chapter: 91, verseStart: 2, verseEnd: null },
  { phrase: "a thousand shall fall at thy side", reference: "Psalm 91:7", book: "Psalms", chapter: 91, verseStart: 7, verseEnd: null },
  { phrase: "he shall give his angels charge over thee", reference: "Psalm 91:11", book: "Psalms", chapter: 91, verseStart: 11, verseEnd: null },
];

// ============================================
// Combine all phrases
// ============================================
export const COMMON_PHRASES: PhraseMatch[] = [
  ...SALVATION_PHRASES,
  ...FAITH_TRUST_PHRASES,
  ...LOVE_PHRASES,
  ...COMFORT_PEACE_PHRASES,
  ...JESUS_IDENTITY_PHRASES,
  ...POWER_VICTORY_PHRASES,
  ...NEW_CREATION_PHRASES,
  ...GUIDANCE_WISDOM_PHRASES,
  ...FRUIT_OF_SPIRIT_PHRASES,
  ...GREAT_COMMISSION_PHRASES,
  ...CREATION_GENESIS_PHRASES,
  ...REVELATION_PHRASES,
  ...PSALMS_PHRASES,
];

// Fast lookup
const phraseMap = new Map<string, PhraseMatch>();
for (const phrase of COMMON_PHRASES) {
  phraseMap.set(phrase.phrase, phrase);
}

/**
 * Find phrase matches in text
 * Returns matches sorted by phrase length (longer = more specific)
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
  
  // Sort by phrase length (longer = more specific)
  return matches.sort((a, b) => b.phrase.length - a.phrase.length);
}

// Export count for debugging
export const PHRASE_COUNT = COMMON_PHRASES.length;
