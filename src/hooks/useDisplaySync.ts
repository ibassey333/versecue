// ============================================
// Display Sync Hook - Supabase Realtime
// ============================================
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { QueueItem } from '@/types';

interface DisplayState {
  id: string;
  reference: string | null;
  book: string | null;
  chapter: number | null;
  verse_start: number | null;
  verse_end: number | null;
  verse_text: string | null;
  translation: string | null;
  updated_at: string;
}

export function useDisplaySync(orgSlug?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const supabase = createClient();
  
  // Use org slug or fallback to default
  const sessionId = orgSlug || 'default-session';
  const channelName = `display-${sessionId}`;
  
  // Broadcast display to all connected clients
  const broadcastDisplay = useCallback(async (item: QueueItem | null) => {
    console.log('[DisplaySync] Broadcasting to:', sessionId, item?.reference.reference || 'clear');
    
    try {
      if (item) {
        const { error } = await supabase
          .from('display_state')
          .upsert({
            id: sessionId,
            reference: item.reference.reference,
            book: item.reference.book,
            chapter: item.reference.chapter,
            verse_start: item.reference.verseStart,
            verse_end: item.reference.verseEnd,
            verse_text: item.verseText || '',
            translation: item.translation || 'KJV',
            updated_at: new Date().toISOString(),
          });
          
        if (error) {
          console.error('[DisplaySync] Broadcast error:', error);
        } else {
          console.log('[DisplaySync] Broadcast success');
        }
      } else {
        // Clear display
        const { error } = await supabase
          .from('display_state')
          .upsert({
            id: sessionId,
            reference: null,
            book: null,
            chapter: null,
            verse_start: null,
            verse_end: null,
            verse_text: null,
            translation: null,
            updated_at: new Date().toISOString(),
          });
          
        if (error) {
          console.error('[DisplaySync] Clear error:', error);
        }
      }
    } catch (err) {
      console.error('[DisplaySync] Error:', err);
    }
  }, [sessionId, supabase]);

  // Set up connection status
  useEffect(() => {
    const channel = supabase
      .channel(channelName)
      .on('presence', { event: 'sync' }, () => {
        setIsConnected(true);
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, supabase]);

  return {
    broadcastDisplay,
    isConnected,
  };
}

// Hook for display page to receive updates
export function useDisplayReceiver(orgSlug: string) {
  const [currentDisplay, setCurrentDisplay] = useState<DisplayState | null>(null);
  const supabase = createClient();
  
  const sessionId = orgSlug;
  const channelName = `display-${sessionId}`;

  useEffect(() => {
    console.log('[DisplayReceiver] Setting up for:', sessionId);
    
    // Initial fetch
    const fetchInitial = async () => {
      const { data, error } = await supabase
        .from('display_state')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (data && data.reference) {
        console.log('[DisplayReceiver] Initial state:', data.reference);
        setCurrentDisplay(data);
      }
    };
    
    fetchInitial();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'display_state',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('[DisplayReceiver] Realtime update:', payload);
          const newData = payload.new as DisplayState;
          
          if (newData) {
            setCurrentDisplay(newData);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, channelName, supabase]);

  const clearDisplay = useCallback(() => {
    setCurrentDisplay(null);
  }, []);

  return {
    currentDisplay,
    clearDisplay,
  };
}
