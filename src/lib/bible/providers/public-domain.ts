// ============================================
// Public Domain Bible Provider
// KJV and WEB translations (no licensing required)
// ============================================

import { BibleVerse, ScriptureReference } from '@/types';

// Public domain API endpoints
const PUBLIC_API_BASE = 'https://bible-api.com';

/**
 * Fetch verse from bible-api.com (public domain)
 * Supports KJV, WEB (World English Bible), and others
 */
export async function fetchPublicDomainVerse(
  reference: ScriptureReference,
  translation: 'kjv' | 'web' = 'kjv'
): Promise<BibleVerse | null> {
  try {
    // Build the reference string for the API
    let refString = `${reference.book}+${reference.chapter}`;
    if (reference.verseStart) {
      refString += `:${reference.verseStart}`;
      if (reference.verseEnd && reference.verseEnd !== reference.verseStart) {
        refString += `-${reference.verseEnd}`;
      }
    }
    
    // bible-api.com uses URL encoding
    const encodedRef = encodeURIComponent(refString);
    const url = `${PUBLIC_API_BASE}/${encodedRef}?translation=${translation}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 86400 }, // Cache for 24 hours
    });
    
    if (!response.ok) {
      console.error(`Public domain API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.error) {
      console.error(`Public domain API error: ${data.error}`);
      return null;
    }
    
    return {
      reference: reference.reference,
      text: data.text?.trim() || '',
      translation: translation.toUpperCase(),
      book: reference.book,
      chapter: reference.chapter,
      verseStart: reference.verseStart || 1,
      verseEnd: reference.verseEnd || null,
      cachedAt: new Date(),
    };
  } catch (error) {
    console.error('Public domain verse fetch error:', error);
    return null;
  }
}

/**
 * Fallback verse lookup from embedded data
 * Contains most commonly referenced verses for offline support
 */
const COMMON_VERSES: Record<string, { text: string; translation: string }> = {
  'John 3:16': {
    text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
    translation: 'KJV',
  },
  'Romans 8:28': {
    text: 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.',
    translation: 'KJV',
  },
  'Philippians 4:13': {
    text: 'I can do all things through Christ which strengtheneth me.',
    translation: 'KJV',
  },
  'Jeremiah 29:11': {
    text: 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.',
    translation: 'KJV',
  },
  'Psalm 23:1': {
    text: 'The LORD is my shepherd; I shall not want.',
    translation: 'KJV',
  },
  'Proverbs 3:5': {
    text: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.',
    translation: 'KJV',
  },
  'Proverbs 3:5-6': {
    text: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.',
    translation: 'KJV',
  },
  'Isaiah 40:31': {
    text: 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.',
    translation: 'KJV',
  },
  'Matthew 6:33': {
    text: 'But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.',
    translation: 'KJV',
  },
  'Matthew 28:19': {
    text: 'Go ye therefore, and teach all nations, baptizing them in the name of the Father, and of the Son, and of the Holy Ghost.',
    translation: 'KJV',
  },
  'Matthew 28:19-20': {
    text: 'Go ye therefore, and teach all nations, baptizing them in the name of the Father, and of the Son, and of the Holy Ghost: Teaching them to observe all things whatsoever I have commanded you: and, lo, I am with you always, even unto the end of the world. Amen.',
    translation: 'KJV',
  },
  'Ephesians 2:8': {
    text: 'For by grace are ye saved through faith; and that not of yourselves: it is the gift of God.',
    translation: 'KJV',
  },
  'Ephesians 2:8-9': {
    text: 'For by grace are ye saved through faith; and that not of yourselves: it is the gift of God: Not of works, lest any man should boast.',
    translation: 'KJV',
  },
  '1 Corinthians 13:4': {
    text: 'Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up.',
    translation: 'KJV',
  },
  '1 Corinthians 13:4-7': {
    text: 'Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up, Doth not behave itself unseemly, seeketh not her own, is not easily provoked, thinketh no evil; Rejoiceth not in iniquity, but rejoiceth in the truth; Beareth all things, believeth all things, hopeth all things, endureth all things.',
    translation: 'KJV',
  },
  '1 Corinthians 13:13': {
    text: 'And now abideth faith, hope, charity, these three; but the greatest of these is charity.',
    translation: 'KJV',
  },
  'Galatians 5:22-23': {
    text: 'But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith, Meekness, temperance: against such there is no law.',
    translation: 'KJV',
  },
  'Psalm 23': {
    text: 'The LORD is my shepherd; I shall not want. He maketh me to lie down in green pastures: he leadeth me beside the still waters. He restoreth my soul: he leadeth me in the paths of righteousness for his name\'s sake. Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me. Thou preparest a table before me in the presence of mine enemies: thou anointest my head with oil; my cup runneth over. Surely goodness and mercy shall follow me all the days of my life: and I will dwell in the house of the LORD for ever.',
    translation: 'KJV',
  },
  'Romans 12:1-2': {
    text: 'I beseech you therefore, brethren, by the mercies of God, that ye present your bodies a living sacrifice, holy, acceptable unto God, which is your reasonable service. And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God.',
    translation: 'KJV',
  },
  'Joshua 1:9': {
    text: 'Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.',
    translation: 'KJV',
  },
  '2 Timothy 3:16': {
    text: 'All scripture is given by inspiration of God, and is profitable for doctrine, for reproof, for correction, for instruction in righteousness.',
    translation: 'KJV',
  },
  '2 Timothy 3:16-17': {
    text: 'All scripture is given by inspiration of God, and is profitable for doctrine, for reproof, for correction, for instruction in righteousness: That the man of God may be perfect, thoroughly furnished unto all good works.',
    translation: 'KJV',
  },
  'Hebrews 11:1': {
    text: 'Now faith is the substance of things hoped for, the evidence of things not seen.',
    translation: 'KJV',
  },
  'Romans 3:23': {
    text: 'For all have sinned, and come short of the glory of God.',
    translation: 'KJV',
  },
  'Romans 6:23': {
    text: 'For the wages of sin is death; but the gift of God is eternal life through Jesus Christ our Lord.',
    translation: 'KJV',
  },
  'John 14:6': {
    text: 'Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me.',
    translation: 'KJV',
  },
  'Matthew 11:28': {
    text: 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.',
    translation: 'KJV',
  },
  'Matthew 11:28-30': {
    text: 'Come unto me, all ye that labour and are heavy laden, and I will give you rest. Take my yoke upon you, and learn of me; for I am meek and lowly in heart: and ye shall find rest unto your souls. For my yoke is easy, and my burden is light.',
    translation: 'KJV',
  },
};

/**
 * Get verse from embedded common verses (offline fallback)
 */
export function getEmbeddedVerse(reference: ScriptureReference): BibleVerse | null {
  const cached = COMMON_VERSES[reference.reference];
  if (!cached) return null;
  
  return {
    reference: reference.reference,
    text: cached.text,
    translation: cached.translation,
    book: reference.book,
    chapter: reference.chapter,
    verseStart: reference.verseStart || 1,
    verseEnd: reference.verseEnd || null,
    cachedAt: new Date(),
  };
}
