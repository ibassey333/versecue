
"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Music } from 'lucide-react';

// ============================================
// Types
// ============================================
interface ScriptureDisplayState {
  reference: string | null;
  verse_text: string | null;
  translation: string | null;
}

interface WorshipDisplayState {
  mode: 'waiting' | 'displaying';
  current_song_data: {
    title: string;
    artist: string;
    lyrics: string;
  } | null;
  current_section: number;
  total_sections: number;
}

interface DisplaySettings {
  verse_font_size: number;
  verse_font_family: string;
  verse_color: string;
  verse_bold: boolean;
  verse_italic: boolean;
  text_outline: boolean;
  text_outline_color: string;
  text_outline_width: number;
  text_shadow: boolean;
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
  logo_size: number;
  show_watermark: boolean;
}

const DEFAULT_SETTINGS: DisplaySettings = {
  verse_font_size: 42,
  verse_font_family: 'serif',
  verse_color: '#ffffff',
  verse_bold: false,
  verse_italic: false,
  text_outline: false,
  text_outline_color: '#000000',
  text_outline_width: 1,
  text_shadow: true,
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
  logo_size: 80,
  show_watermark: true,
};

// ============================================
// Display Page Component
// ============================================
export default function DisplayPage({ params }: { params: { orgSlug: string } }) {
  const [scriptureDisplay, setScriptureDisplay] = useState<ScriptureDisplayState | null>(null);
  const [worshipDisplay, setWorshipDisplay] = useState<WorshipDisplayState | null>(null);
  const [settings, setSettings] = useState<DisplaySettings>(DEFAULT_SETTINGS);
  const [displayMode, setDisplayMode] = useState<'scripture' | 'worship'>('scripture');
  
  const supabase = createClient();

  useEffect(() => {
    // Fetch initial display settings
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
          setSettings({ ...DEFAULT_SETTINGS, ...settingsData });
        }
      }
    };

    fetchSettings();
  }, [params.orgSlug, supabase]);

  useEffect(() => {
    // Subscribe to scripture display changes
    const fetchScriptureDisplay = async () => {
      const { data } = await supabase
        .from('display_state')
        .select('*')
        .eq('id', params.orgSlug)
        .single();
      
      if (data) {
        setScriptureDisplay(data);
        if (data.reference) {
          setDisplayMode('scripture');
        }
      }
    };

    fetchScriptureDisplay();

    const scriptureChannel = supabase
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
            const data = payload.new as ScriptureDisplayState;
            setScriptureDisplay(data);
            if (data.reference) {
              setDisplayMode('scripture');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(scriptureChannel);
    };
  }, [params.orgSlug, supabase]);

  useEffect(() => {
    // Subscribe to worship display changes
    const fetchWorshipDisplay = async () => {
      const { data } = await supabase
        .from('worship_display_state')
        .select('*')
        .eq('id', params.orgSlug)
        .single();
      
      if (data && data.mode === 'displaying') {
        setWorshipDisplay(data);
        setDisplayMode('worship');
      }
    };

    fetchWorshipDisplay();

    const worshipChannel = supabase
      .channel(`worship-display-${params.orgSlug}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'worship_display_state',
          filter: `id=eq.${params.orgSlug}`,
        },
        (payload) => {
          if (payload.new) {
            const data = payload.new as WorshipDisplayState;
            setWorshipDisplay(data);
            if (data.mode === 'displaying' && data.current_song_data) {
              setDisplayMode('worship');
            } else if (data.mode === 'waiting') {
              // Check if scripture should be shown
              if (!scriptureDisplay?.reference) {
                setDisplayMode('scripture'); // Will show waiting state
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(worshipChannel);
    };
  }, [params.orgSlug, supabase, scriptureDisplay]);

  // Get current lyrics section
  const getCurrentLyrics = () => {
    if (!worshipDisplay?.current_song_data?.lyrics) return '';
    const sections = worshipDisplay.current_song_data.lyrics.split(/\n\n+/).filter(Boolean);
    return sections[worshipDisplay.current_section] || '';
  };

  const verticalAlignClass = {
    top: 'justify-start pt-8',
    center: 'justify-center',
    bottom: 'justify-end pb-8',
  }[settings.vertical_align] || 'justify-center';

  const logoPositionClass = {
    'top-left': 'top-6 left-6',
    'top-right': 'top-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'bottom-right': 'bottom-6 right-6',
  }[settings.logo_position] || '';

  const textStyles: React.CSSProperties = {
    fontWeight: settings.verse_bold ? 'bold' : 'normal',
    fontStyle: settings.verse_italic ? 'italic' : 'normal',
    textShadow: settings.text_shadow ? '2px 2px 4px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.3)' : undefined,
  };

  // Render Worship Display
  if (displayMode === 'worship' && worshipDisplay?.mode === 'displaying' && worshipDisplay.current_song_data) {
    const lyrics = getCurrentLyrics();
    
    return (
      <div 
        className={`min-h-screen flex flex-col ${verticalAlignClass} relative`}
        style={{ 
          backgroundColor: settings.background_color,
          backgroundImage: settings.background_image_url ? `url(${settings.background_image_url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          padding: settings.padding,
        }}
      >
        {/* Logo */}
        {settings.logo_url && settings.logo_position !== 'none' && (
          <img
            src={settings.logo_url}
            alt="Logo"
            className={`absolute ${logoPositionClass}`}
            style={{ width: settings.logo_size, height: 'auto', objectFit: 'contain' }}
          />
        )}

        <div className="w-full" style={{ textAlign: settings.text_align as any }}>
          {/* Song Title */}
          <h1 
            className="font-bold mb-8"
            style={{ 
              fontSize: settings.reference_font_size,
              color: settings.reference_color,
              ...textStyles,
            }}
          >
            {worshipDisplay.current_song_data.title}
          </h1>

          {/* Lyrics */}
          <pre 
            className="font-sans leading-relaxed whitespace-pre-wrap"
            style={{ 
              fontSize: settings.verse_font_size,
              color: settings.verse_color,
              ...textStyles,
            }}
          >
            {lyrics}
          </pre>

          {/* Artist */}
          <p 
            className="mt-8 uppercase tracking-widest"
            style={{ 
              fontSize: settings.translation_font_size,
              color: settings.translation_color,
            }}
          >
            — {worshipDisplay.current_song_data.artist} —
          </p>
        </div>

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

  // Render Scripture Display (existing behavior)
  if (scriptureDisplay?.reference) {
    return (
      <div 
        className={`min-h-screen flex flex-col ${verticalAlignClass} relative`}
        style={{ 
          backgroundColor: settings.background_color,
          backgroundImage: settings.background_image_url ? `url(${settings.background_image_url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          padding: settings.padding,
        }}
      >
        {/* Logo */}
        {settings.logo_url && settings.logo_position !== 'none' && (
          <img
            src={settings.logo_url}
            alt="Logo"
            className={`absolute ${logoPositionClass}`}
            style={{ width: settings.logo_size, height: 'auto', objectFit: 'contain' }}
          />
        )}

        <div className="w-full" style={{ textAlign: settings.text_align as any }}>
          {/* Reference - Top */}
          {settings.reference_position === 'top' && (
            <h1 
              className="font-bold mb-6"
              style={{ 
                fontSize: settings.reference_font_size,
                color: settings.reference_color,
              }}
            >
              {scriptureDisplay.reference}
            </h1>
          )}

          {/* Verse Text */}
          <p 
            className="font-serif leading-relaxed"
            style={{ 
              fontSize: settings.verse_font_size,
              color: settings.verse_color,
              ...textStyles,
            }}
          >
            "{scriptureDisplay.verse_text}"
          </p>

          {/* Reference - Bottom */}
          {settings.reference_position === 'bottom' && (
            <h1 
              className="font-bold mt-6"
              style={{ 
                fontSize: settings.reference_font_size,
                color: settings.reference_color,
              }}
            >
              {scriptureDisplay.reference}
            </h1>
          )}

          {/* Translation */}
          {settings.show_translation && scriptureDisplay.translation && (
            <p 
              className="mt-6 uppercase tracking-widest"
              style={{ 
                fontSize: settings.translation_font_size,
                color: settings.translation_color,
              }}
            >
              — {scriptureDisplay.translation} —
            </p>
          )}
        </div>

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

  // Waiting State
  return (
    <div 
      className={`min-h-screen flex flex-col ${verticalAlignClass} relative`}
      style={{ 
        backgroundColor: settings.background_color,
        backgroundImage: settings.background_image_url ? `url(${settings.background_image_url})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: settings.padding,
      }}
    >
      <div className="text-center">
        <h1 
          className="font-bold mb-4"
          style={{ color: settings.reference_color, fontSize: 48 }}
        >
          VerseCue
        </h1>
        <p style={{ color: settings.translation_color, fontSize: 24 }}>
          Waiting for content...
        </p>
      </div>

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
