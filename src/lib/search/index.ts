// ============================================
// Search Module Exports
// ============================================

export {
  parseFlexibleReference,
  getBookSuggestions,
  findBook,
  normalizeInput,
  looksLikeReference,
  BIBLE_BOOKS,
  type ParsedReference,
} from './flexibleParser';

export {
  searchKJVText,
  looksLikeVerseText,
  getQuickSuggestions,
  type TextSearchResult,
} from './textSearch';

export {
  smartSearch,
  getSuggestions,
  getRecentSearches,
  addRecentSearch,
  clearRecentSearches,
  formatReference,
  type SearchResult,
  type SearchResultType,
  type SearchState,
} from './smartSearch';
