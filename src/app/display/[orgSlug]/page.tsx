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

interface DisplaySettings {
  verse_font_size: number;
  verse_font_family: string;
  verse_color: string;
  reference_font_size: number;
  reference_color: string;
  reference_position: string;
  translation_font_size: number;
  translation_color: string;
  translation_position: string;
  show_translation: boolean;
  background_color: string;
  background_image_url: string | null;
  text_align: string;
  vertical_align: string;
  padding: number;
  logo_url: string | null;
  logo_position: string;
  show_watermark: boolean;
}

const DEFAULT_SETTINGS: DisplaySettings = {
  verse_font_size: 42,
  verse_font_family: 'serif',
  verse_color: '#ffffff',
  reference_font_size: 56,
  reference_color: '#fbbf24',
  reference_position: 'top',
  translation_font_size: 16,
  translation_color: '#9ca3af',
  translation_position: 'below',
  show_translation: true,
  background_color: '#000000',
  background_image_url: null,
  text_align: 'center',
  vertical_align: 'center',
  padding: 48,
  logo_url: null,
  logo_position: 'none',
  show_watermark: true,
};

export default function DisplayPage({ params }: { params: { orgSlug: string } }) {
  const [display, setDisplay] = useState<DisplayState | null>(null);
  const [settings, setSettings] = useState<DisplaySettings>(DEFAULT_SETTINGS);
  const supabase = createClient();

  useEffect(() => {
    // Fetch initial display state
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

    // Fetch display settings
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
          setSettings({
            verse_font_size: settingsData.verse_font_size ?? DEFAULT_SETTINGS.verse_font_size,
            verse_font_family: settingsData.verse_font_family ?? DEFAULT_SETTINGS.verse_font_family,
            verse_color: settingsData.verse_color ?? DEFAULT_SETTINGS.verse_color,
            reference_font_size: settingsData.reference_font_size ?? DEFAULT_SETTINGS.reference_font_size,
            reference_color: settingsData.reference_color ?? DEFAULT_SETTINGS.reference_color,
            reference_position: settingsData.reference_position ?? DEFAULT_SETTINGS.reference_position,
            translation_font_size: settingsData.translation_font_size ?? DEFAULT_SETTINGS.translation_font_size,
            translation_color: settingsData.translation_color ?? DEFAULT_SETTINGS.translation_color,
            translation_position: settingsData.translation_position ?? DEFAULT_SETTINGS.translation_position,
            show_translation: settingsData.show_translation ?? DEFAULT_SETTINGS.show_translation,
            background_color: settingsData.background_color ?? DEFAULT_SETTINGS.background_color,
            background_image_url: settingsData.background_image_url,
            text_align: settingsData.text_align ?? DEFAULT_SETTINGS.text_align,
            vertical_align: settingsData.vertical_align ?? DEFAULT_SETTINGS.vertical_align,
            padding: settingsData.padding ?? DEFAULT_SETTINGS.padding,
            logo_url: settingsData.logo_url,
            logo_position: settingsData.logo_position ?? DEFAULT_SETTINGS.logo_position,
            show_watermark: settingsData.show_watermark ?? DEFAULT_SETTINGS.show_watermark,
          });
        }
      }
    };

    fetchDisplay();
    fetchSettings();

    // Subscribe to realtime display updates
    const displayChannel = supabase
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

    // Subscribe to realtime settings updates
    const settingsChannel = supabase
      .channel(`settings-${params.orgSlug}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'display_settings',
        },
        (payload) => {
          // Refetch settings on any update
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(displayChannel);
      supabase.removeChannel(settingsChannel);
    };
  }, [params.orgSlug]);

  const fontFamilyClass = {
    serif: 'font-serif',
    sans: 'font-sans',
    mono: 'font-mono',
  }[settings.verse_font_family as 'serif' | 'sans' | 'mono'] || 'font-serif';

  const verticalAlignClass = {
    top: 'justify-start pt-8',
    center: 'justify-center',
    bottom: 'justify-end pb-8',
  }[settings.vertical_align] || 'justify-center';

  return (
    <div 
      className={`min-h-screen flex flex-col ${verticalAlignClass}`}
      style={{ 
        backgroundColor: settings.background_color,
        backgroundImage: settings.background_image_url ? `url(${settings.background_image_url})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: settings.padding,
      }}
    >
      {display?.reference ? (
        <div 
          className="w-full max-w-6xl mx-auto"
          style={{ textAlign: settings.text_align as any }}
        >
          {/* Reference - Top */}
          {settings.reference_position === 'top' && (
            <h1 
              className="font-bold mb-6"
              style={{ 
                fontSize: settings.reference_font_size,
                color: settings.reference_color,
              }}
            >
              {display.reference}
            </h1>
          )}

          {/* Verse Text */}
          {display.verse_text && (
            <p 
              className={`${fontFamilyClass} leading-relaxed`}
              style={{ 
                fontSize: settings.verse_font_size,
                color: settings.verse_color,
              }}
            >
              "{display.verse_text}"
            </p>
          )}

          {/* Reference - Bottom */}
          {settings.reference_position === 'bottom' && (
            <h1 
              className="font-bold mt-6"
              style={{ 
                fontSize: settings.reference_font_size,
                color: settings.reference_color,
              }}
            >
              {display.reference}
            </h1>
          )}

          {/* Translation - Below */}
          {settings.show_translation && settings.translation_position === 'below' && display.translation && (
            <p 
              className="mt-6 uppercase tracking-widest"
              style={{ 
                fontSize: settings.translation_font_size,
                color: settings.translation_color,
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
            style={{ color: settings.reference_color, fontSize: 48 }}
          >
            VerseCue
          </h1>
          <p style={{ color: settings.translation_color, fontSize: 24 }}>
            Waiting for scripture...
          </p>
        </div>
      )}

      {/* Translation - Corner */}
      {display?.reference && settings.show_translation && settings.translation_position === 'corner' && display.translation && (
        <p 
          className="absolute bottom-6 right-8 uppercase tracking-widest"
          style={{ 
            fontSize: settings.translation_font_size,
            color: settings.translation_color,
          }}
        >
          {display.translation}
        </p>
      )}

      {/* Watermark */}
      {settings.show_watermark && (
        <div 
          className="absolute bottom-4 left-6 text-sm opacity-50"
          style={{ color: settings.translation_color }}
        >
          Powered by VerseCue
        </div>
      )}
    </div>
  );
}
