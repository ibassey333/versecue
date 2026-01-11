// ============================================
// Supabase Client for Realtime Display Sync
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for display sync
export interface DisplayState {
  id: string;
  reference: string;
  book: string;
  chapter: number;
  verse_start: number | null;
  verse_end: number | null;
  verse_text: string;
  translation: string;
  updated_at: string;
}

// Channel name for realtime
export const DISPLAY_CHANNEL = 'versecue-display';
