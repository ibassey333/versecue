// ============================================
// Display Sync Hook - Supabase Realtime
// ============================================

import { useEffect, useState, useCallback } from 'react';
import { supabase, DisplayState, DISPLAY_CHANNEL } from '@/lib/supabase';
import { QueueItem } from '@/types';

// Use a fixed session ID for simplicity (can be made dynamic later)
const SESSION_ID = 'default-session';

export function useDisplaySync() {
  const [isConnected, setIsConnected] = useState(false);
  
  // Broadcast display to all connected clients
  const broadcastDisplay = useCallback(async (item: QueueItem | null) => {
    console.log('[DisplaySync] Broadcasting:', item?.reference.reference || 'clear');
    
    try {
      if (item) {
        const { error } = await supabase
          .from('display_state')
          .upsert({
            id: SESSION_ID,
            reference: item.reference.reference,
            book: item.reference.book,
            chapter: item.reference.chapter,
            verse_start: item.reference.verseStart,
            verse_end: item.reference.verseEnd,
            verse_text: item.verseText || '',
            translation: item.translation || 'KJV',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
        
        if (error) {
          console.error('[DisplaySync] Broadcast error:', error);
        } else {
          console.log('[DisplaySync] Broadcast success');
        }
      } else {
        // Clear display
        const { error } = await supabase
          .from('display_state')
          .update({
            reference: '',
            verse_text: '',
            updated_at: new Date().toISOString(),
          })
          .eq('id', SESSION_ID);
        
        if (error) console.error('[DisplaySync] Clear error:', error);
      }
    } catch (err) {
      console.error('[DisplaySync] Error:', err);
    }
  }, []);
  
  return { broadcastDisplay, isConnected };
}

export function useDisplayReceiver() {
  const [currentDisplay, setCurrentDisplay] = useState<DisplayState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    console.log('[DisplayReceiver] Setting up realtime subscription...');
    
    // Initial fetch
    const fetchInitial = async () => {
      const { data, error } = await supabase
        .from('display_state')
        .select('*')
        .eq('id', SESSION_ID)
        .single();
      
      if (data && data.reference) {
        console.log('[DisplayReceiver] Initial state:', data.reference);
        setCurrentDisplay(data);
      }
    };
    
    fetchInitial();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel(DISPLAY_CHANNEL)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'display_state',
          filter: `id=eq.${SESSION_ID}`,
        },
        (payload) => {
          console.log('[DisplayReceiver] Realtime update:', payload);
          const newData = payload.new as DisplayState;
          
          if (newData && newData.reference) {
            setCurrentDisplay(newData);
          } else {
            setCurrentDisplay(null);
          }
        }
      )
      .subscribe((status) => {
        console.log('[DisplayReceiver] Subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });
    
    return () => {
      console.log('[DisplayReceiver] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, []);
  
  return { currentDisplay, isConnected };
}
