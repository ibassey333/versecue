// ============================================
// AI Scripture Search
// Uses Groq to understand natural language queries
// ============================================

import { ScriptureReference } from '@/types';

export interface AISearchResult {
  reference: ScriptureReference;
  preview: string;
  confidence: number;
  reasoning: string;
}

export async function searchWithAI(query: string): Promise<AISearchResult[]> {
  if (query.length < 3) return [];
  
  console.log('[AI Search] Query:', query);
  
  try {
    const response = await fetch('/api/search-scripture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    
    if (!response.ok) {
      console.warn('[AI Search] API error:', response.status);
      return [];
    }
    
    const data = await response.json();
    
    if (!data.success || !data.data || !Array.isArray(data.data)) {
      return [];
    }
    
    console.log('[AI Search] Found', data.data.length, 'results');
    return data.data;
  } catch (error) {
    console.error('[AI Search] Failed:', error);
    return [];
  }
}
