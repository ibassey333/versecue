// ============================================
// Translation Configuration
// Future-proof: Enable Pro translations by flipping enabled: true
// ============================================

import { Translation } from '@/types';

export const TRANSLATIONS: Record<string, Translation> = {
  // Always available - Local (instant)
  KJV: {
    id: 'KJV',
    name: 'King James Version',
    abbreviation: 'KJV',
    source: 'local',
    enabled: true,
  },
  
  // Starter Plan - API.Bible (free)
  WEB: {
    id: 'WEB',
    name: 'World English Bible',
    abbreviation: 'WEB',
    source: 'api-bible',
    enabled: true,
    apiId: '9879dbb7cfe39e4d-02', // API.Bible ID for WEB
  },
  ASV: {
    id: 'ASV',
    name: 'American Standard Version',
    abbreviation: 'ASV',
    source: 'api-bible',
    enabled: true,
    apiId: '06125adad2d5898a-01', // API.Bible ID for ASV
  },
  
  // Pro Plan - Enable when upgraded ($29/month)
  NIV: {
    id: 'NIV',
    name: 'New International Version',
    abbreviation: 'NIV',
    source: 'api-bible',
    enabled: false, // Flip to true with Pro
    apiId: '78a9f6124f344018-01',
  },
  ESV: {
    id: 'ESV',
    name: 'English Standard Version',
    abbreviation: 'ESV',
    source: 'api-bible',
    enabled: false,
    apiId: '9879dbb7cfe39e4d-04',
  },
  NLT: {
    id: 'NLT',
    name: 'New Living Translation',
    abbreviation: 'NLT',
    source: 'api-bible',
    enabled: false,
    apiId: '65eec8e0b60e656b-01',
  },
  NKJV: {
    id: 'NKJV',
    name: 'New King James Version',
    abbreviation: 'NKJV',
    source: 'api-bible',
    enabled: false,
    apiId: 'de4e12af7f28f599-02',
  },
};

// Get enabled translations
export function getEnabledTranslations(): Translation[] {
  return Object.values(TRANSLATIONS).filter(t => t.enabled);
}

// Get translation by ID
export function getTranslation(id: string): Translation | null {
  return TRANSLATIONS[id] || null;
}

// Default quick buttons (user can customize in settings)
export const DEFAULT_QUICK_TRANSLATIONS = ['KJV', 'WEB', 'ASV'];
