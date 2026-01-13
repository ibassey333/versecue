"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface DisplayState {
  reference: string | null;
  verse_text: string | null;
  translation: string | null;
  book: string | null;
  chapter: number | null;
  verse_start: number | null;
  verse_end: number | null;
}

export default function DisplayPage({ params }: { params: { orgSlug: string } }) {
  const [display, setDisplay] = useState<DisplayState | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchDisplay = async () => {
      const { data } = await supabase
        .from('display_state')
        .select('*')
        .eq('id', params.orgSlug)
        .single();
      
      if (data) {
        setDisplay(data);
      }
    };

    const fetchSettings = async () => {
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', params.orgSlug)
        .single();

      if (org) {
        const { data: settingsData } = await supabase
          .from('display_settings')
          .select('*')
          .eq('organization_id', org.id)
          .single();
        
        if (settingsData) {
          setSettings(settingsData);
        }
      }
    };

    fetchDisplay();
    fetchSettings();

    const channel = supabase
      .channel(`display-${params.orgSlug}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'display_state',
          filter: `id=eq.${params.orgSlug}`,
        },
        (payload) => {
          if (payload.new) {
            setDisplay(payload.new as DisplayState);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.orgSlug]);

  const s = settings || {
    verse_font_size: 42,
    verse_font_family: 'serif',
    verse_color: '#ffffff',
    reference_font_size: 56,
    reference_color: '#fbbf24',
    translation_font_size: 16,
    translation_color: '#9ca3af',
    show_translation: true,
    background_color: '#000000',
    text_align: 'center',
    padding: 48,
  };

  const fontFamilyClass = {
    serif: 'font-serif',
    sans: 'font-sans',
    mono: 'font-mono',
  }[s.verse_font_family as 'serif' | 'sans' | 'mono'] || 'font-serif';

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{ 
        backgroundColor: s.background_color,
        backgroundImage: s.background_image_url ? `url(${s.background_image_url})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        textAlign: s.text_align as any,
        padding: s.padding,
      }}
    >
      {display?.reference ? (
        <div className="max-w-5xl w-full">
          <h1 
            className="font-bold mb-8"
            style={{ 
              fontSize: s.reference_font_size,
              color: s.reference_color,
            }}
          >
            {display.reference}
          </h1>

          {display.verse_text && (
            <p 
              className={`${fontFamilyClass} leading-relaxed`}
              style={{ 
                fontSize: s.verse_font_size,
                color: s.verse_color,
              }}
            >
              "{display.verse_text}"
            </p>
          )}

          {s.show_translation && display.translation && (
            <p 
              className="mt-8 uppercase tracking-widest"
              style={{ 
                fontSize: s.translation_font_size,
                color: s.translation_color,
              }}
            >
              — {display.translation} —
            </p>
          )}
        </div>
      ) : (
        <div className="text-center">
          <h1 
            className="font-bold mb-4"
            style={{ color: s.reference_color, fontSize: 32 }}
          >
            VerseCue
          </h1>
          <p style={{ color: s.translation_color, fontSize: 18 }}>
            Waiting for scripture...
          </p>
        </div>
      )}

      {s.show_watermark && (
        <div className="absolute bottom-4 right-4 text-xs opacity-50" style={{ color: s.translation_color }}>
          Powered by VerseCue
        </div>
      )}
    </div>
  );
}
