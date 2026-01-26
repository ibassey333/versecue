// ============================================
// Worship Display Sync Hook - Supabase Realtime
// ============================================
import { useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSessionStore } from '@/stores/session';

interface WorshipDisplayPayload {
  mode: 'waiting' | 'displaying';
  song_title: string | null;
  song_artist: string | null;
  current_lyrics: string | null;
  section_index: number;
  total_sections: number;
}

export function useWorshipDisplaySync(orgSlug?: string) {
  const supabase = createClient();
  const sessionId = orgSlug || 'default-session';
  
  const worship = useSessionStore((s) => s.worship);
  const mode = useSessionStore((s) => s.mode);
  
  // Broadcast worship display state
  const broadcastWorshipDisplay = useCallback(async () => {
    if (mode !== 'worship') return;
    
    const song = worship.currentSong;
    const sectionIndex = worship.currentSectionIndex;
    
    // Get current section lyrics
    let currentLyrics: string | null = null;
    let totalSections = 0;
    
    if (song && song.lyrics) {
      const sections = song.lyrics.split(/\n\n+/).filter(Boolean);
      totalSections = sections.length;
      currentLyrics = sections[sectionIndex] || null;
    }
    
    const payload: WorshipDisplayPayload = {
      mode: song ? 'displaying' : 'waiting',
      song_title: song?.title || null,
      song_artist: song?.artist || null,
      current_lyrics: currentLyrics,
      section_index: sectionIndex,
      total_sections: totalSections,
    };
    
    try {
      const { error } = await supabase
        .from('worship_display_state')
        .upsert({
          id: sessionId,
          mode: payload.mode,
          current_song_data: song ? {
            title: song.title,
            artist: song.artist,
            lyrics: song.lyrics,
          } : null,
          current_section: payload.section_index,
          total_sections: payload.total_sections,
          updated_at: new Date().toISOString(),
        });
        
      if (error) {
        console.error('[WorshipSync] Broadcast error:', error);
      } else {
        console.log('[WorshipSync] Broadcast success - Section', sectionIndex + 1, 'of', totalSections);
      }
    } catch (err) {
      console.error('[WorshipSync] Error:', err);
    }
  }, [sessionId, supabase, worship.currentSong, worship.currentSectionIndex, mode]);

  // Auto-broadcast when worship state changes
  useEffect(() => {
    if (mode === 'worship') {
      broadcastWorshipDisplay();
    }
  }, [mode, worship.currentSong, worship.currentSectionIndex, broadcastWorshipDisplay]);

  // Clear display when switching away from worship mode
  useEffect(() => {
    if (mode !== 'worship') {
      supabase
        .from('worship_display_state')
        .upsert({
          id: sessionId,
          mode: 'waiting',
          current_song_data: null,
          current_section: 0,
          total_sections: 0,
          updated_at: new Date().toISOString(),
        })
        .then(() => console.log('[WorshipSync] Cleared worship display'));
    }
  }, [mode, sessionId, supabase]);

  return { broadcastWorshipDisplay };
}

// Hook for display page to receive worship updates
export function useWorshipDisplayReceiver(orgSlug: string) {
  const supabase = createClient();
  const sessionId = orgSlug;
  
  // Return state that will be managed by the display page
  return {
    subscribe: (callback: (data: any) => void) => {
      // Initial fetch
      supabase
        .from('worship_display_state')
        .select('*')
        .eq('id', sessionId)
        .single()
        .then(({ data }) => {
          if (data) callback(data);
        });
      
      // Subscribe to changes
      const channel = supabase
        .channel(`worship-display-${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'worship_display_state',
            filter: `id=eq.${sessionId}`,
          },
          (payload) => {
            if (payload.new) {
              callback(payload.new);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    },
  };
}
