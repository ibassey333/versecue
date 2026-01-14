// ============================================
// Groq AI Detection - Server-Side with Throttle
// Calls /api/detect-llm route
// Throttled: max 1 call per 8 seconds
// ============================================
import { ScriptureReference } from '@/types';

interface GroqDetectionResult {
  reference: ScriptureReference;
  matchedText: string;
  confidence: number;
  explanation: string;
}

// Throttle state
let lastCallTime = 0;
const THROTTLE_MS = 8000; // 8 seconds between calls

/**
 * Detect implicit scripture references using AI
 * Throttled to prevent excessive API costs
 */
export async function detectWithGroq(text: string): Promise<GroqDetectionResult[]> {
  // Skip very short text
  if (text.length < 25) {
    return [];
  }
  
  // Throttle check
  const now = Date.now();
  if (now - lastCallTime < THROTTLE_MS) {
    console.log('[VerseCue AI] Throttled - waiting', Math.ceil((THROTTLE_MS - (now - lastCallTime)) / 1000), 'sec');
    return [];
  }
  
  lastCallTime = now;
  console.log('[VerseCue AI] Analyzing:', text.substring(0, 50) + '...');
  
  try {
    const response = await fetch('/api/detect-llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: text }),
    });
    
    if (!response.ok) {
      console.warn('[VerseCue AI] API error:', response.status);
      return [];
    }
    
    const data = await response.json();
    
    if (!data.success || !data.data || !Array.isArray(data.data)) {
      return [];
    }
    
    console.log('[VerseCue AI] Found', data.data.length, 'references');
    
    return data.data.map((det: any) => ({
      reference: det.reference,
      matchedText: det.reference.reference,
      confidence: det.confidence,
      explanation: det.reasoning || '',
    }));
  } catch (error) {
    console.error('[VerseCue AI] Detection failed:', error);
    return [];
  }
}
