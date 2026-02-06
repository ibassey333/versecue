// ============================================
// Worship Display Sync Hook - Supabase Realtime
// v2.0 - Smart split support, staged song state
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
  section_label: string | null;
  is_split_part: boolean;
  part_info: string | null; // e.g., "Part 2 of 3"
}

export function useWorshipDisplaySync(orgSlug?: string) {
  const supabase = createClient();
  const sessionId = orgSlug || 'default-session';
  
  const worship = useSessionStore((s) => s.worship);
  const mode = useSessionStore((s) => s.mode);
  
  // Broadcast worship display state
  const broadcastWorshipDisplay = useCallback(async () => {
    if (mode !== 'worship') return;
    
    const { currentSong, currentSectionIndex, displaySections } = worship;
    
    // Only broadcast if:
    // 1. We have a song AND
    // 2. A section is actively selected (index >= 0)
    const isDisplaying = currentSong && currentSectionIndex >= 0;
    
    // Get current section data
    let currentLyrics: string | null = null;
    let sectionLabel: string | null = null;
    let isSplitPart = false;
    let partInfo: string | null = null;
    
    if (isDisplaying && displaySections.length > 0) {
      const section = displaySections[currentSectionIndex];
      if (section) {
        currentLyrics = section.text;
        sectionLabel = section.label;
        isSplitPart = section.isSplitPart;
        
        if (section.isSplitPart) {
          partInfo = `Part ${section.partIndex + 1} of ${section.totalParts}`;
        }
      }
    }
    
    const payload: WorshipDisplayPayload = {
      mode: isDisplaying ? 'displaying' : 'waiting',
      song_title: currentSong?.title || null,
      song_artist: currentSong?.artist || null,
      current_lyrics: currentLyrics,
      section_index: Math.max(0, currentSectionIndex),
      total_sections: displaySections.length,
      section_label: sectionLabel,
      is_split_part: isSplitPart,
      part_info: partInfo,
    };
    
    try {
      const { error } = await supabase
        .from('worship_display_state')
        .upsert({
          id: sessionId,
          mode: payload.mode,
          current_song_data: currentSong ? {
            title: currentSong.title,
            artist: currentSong.artist,
            lyrics: currentSong.lyrics,
            // Smart split metadata (embedded in song_data to avoid schema change)
            current_lyrics: currentLyrics,
            section_label: sectionLabel,
            is_split_part: isSplitPart,
            part_info: partInfo,
          } : null,
          current_section: payload.section_index,
          total_sections: payload.total_sections,
          updated_at: new Date().toISOString(),
        });
        
      if (error) {
        console.error('[WorshipSync] Broadcast error:', error);
      } else {
        if (isDisplaying) {
          console.log('[WorshipSync] Broadcasting section', sectionLabel, '-', currentSectionIndex + 1, 'of', displaySections.length);
        } else {
          console.log('[WorshipSync] Cleared display (song staged but no section selected)');
        }
      }
    } catch (err) {
      console.error('[WorshipSync] Error:', err);
    }
  }, [sessionId, supabase, worship.currentSong, worship.currentSectionIndex, worship.displaySections, mode]);

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
