"use client";

import { useEffect, useState, useRef } from 'react';
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
    // Smart split metadata (embedded by useWorshipDisplaySync)
    current_lyrics?: string;
    section_label?: string;
    is_split_part?: boolean;
    part_info?: string;
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
  padding_top: number | null;
  padding_bottom: number | null;
  padding_left: number | null;
  padding_right: number | null;
  padding_advanced: boolean;
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
  padding_top: null,
  padding_bottom: null,
  padding_left: null,
  padding_right: null,
  padding_advanced: false,
  logo_url: null,
  logo_position: 'none',
  logo_size: 80,
  show_watermark: true,
};

// ============================================
// Helper: Generate text outline using text-shadow
// ============================================
function generateTextOutline(width: number, color: string): string {
  if (width <= 0) return '';
  
  const shadows: string[] = [];
  const steps = width <= 2 ? 8 : 16;
  
  for (let i = 0; i < steps; i++) {
    const angle = (2 * Math.PI * i) / steps;
    const x = Math.round(Math.cos(angle) * width * 10) / 10;
    const y = Math.round(Math.sin(angle) * width * 10) / 10;
    shadows.push(`${x}px ${y}px 0 ${color}`);
  }
  
  if (width > 1) {
    for (let i = 0; i < steps; i++) {
      const angle = (2 * Math.PI * i) / steps;
      const x = Math.round(Math.cos(angle) * (width * 0.5) * 10) / 10;
      const y = Math.round(Math.sin(angle) * (width * 0.5) * 10) / 10;
      shadows.push(`${x}px ${y}px 0 ${color}`);
    }
  }
  
  return shadows.join(', ');
}

// ============================================
// Display Page Component
// ============================================
export default function DisplayPage({ params }: { params: { orgSlug: string } }) {
  const [scriptureDisplay, setScriptureDisplay] = useState<ScriptureDisplayState | null>(null);
  const [worshipDisplay, setWorshipDisplay] = useState<WorshipDisplayState | null>(null);
  const [settings, setSettings] = useState<DisplaySettings>(DEFAULT_SETTINGS);
  const [displayMode, setDisplayMode] = useState<'scripture' | 'worship'>('scripture');
  
  // Use ref to track scripture state in callbacks without causing re-subscriptions
  const scriptureDisplayRef = useRef<ScriptureDisplayState | null>(null);
  
  // Keep ref in sync with state
  useEffect(() => {
    scriptureDisplayRef.current = scriptureDisplay;
  }, [scriptureDisplay]);
  
  // Create supabase client once
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // Fetch display settings
  useEffect(() => {
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

  // Scripture subscription - SEPARATE from worship
  useEffect(() => {
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

  // Worship subscription - SEPARATE, no dependency on scriptureDisplay
  useEffect(() => {
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
          console.log('[Display] Worship update received:', payload.new);
          if (payload.new) {
            const data = payload.new as WorshipDisplayState;
            setWorshipDisplay(data);
            if (data.mode === 'displaying' && data.current_song_data) {
              setDisplayMode('worship');
            } else if (data.mode === 'waiting') {
              // Use ref to avoid stale closure
              if (!scriptureDisplayRef.current?.reference) {
                setDisplayMode('scripture');
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[Display] Worship channel status:', status);
      });

    return () => {
      supabase.removeChannel(worshipChannel);
    };
  }, [params.orgSlug, supabase]); // NO scriptureDisplay dependency!

  // Get current lyrics - uses pre-split lyrics from sync hook if available
  const getCurrentLyrics = (): string => {
    if (!worshipDisplay?.current_song_data) return '';
    
    // Use pre-split lyrics from smart split (embedded by useWorshipDisplaySync)
    if (worshipDisplay.current_song_data.current_lyrics) {
      return worshipDisplay.current_song_data.current_lyrics;
    }
    
    // Fallback: split locally (for backward compatibility)
    if (!worshipDisplay.current_song_data.lyrics) return '';
    const sections = worshipDisplay.current_song_data.lyrics.split(/\n\n+/).filter(Boolean);
    return sections[worshipDisplay.current_section] || '';
  };

  // Get section info for display
  const getSectionInfo = (): { label: string; partInfo: string | null } | null => {
    if (!worshipDisplay?.current_song_data) return null;
    
    const { section_label, part_info, is_split_part } = worshipDisplay.current_song_data;
    
    if (section_label) {
      return {
        label: section_label,
        partInfo: is_split_part ? part_info || null : null,
      };
    }
    
    return {
      label: `${worshipDisplay.current_section + 1}`,
      partInfo: null,
    };
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

  const fontFamily = {
    serif: 'Georgia, "Times New Roman", serif',
    sans: 'system-ui, -apple-system, sans-serif',
    mono: '"Courier New", monospace',
  }[settings.verse_font_family] || 'Georgia, "Times New Roman", serif';

  const getPadding = () => {
    if (settings.padding_advanced) {
      return {
        paddingTop: settings.padding_top ?? settings.padding,
        paddingBottom: settings.padding_bottom ?? settings.padding,
        paddingLeft: settings.padding_left ?? settings.padding,
        paddingRight: settings.padding_right ?? settings.padding,
      };
    }
    return { padding: settings.padding };
  };

  const buildTextShadow = (): string | undefined => {
    const shadows: string[] = [];
    
    if (settings.text_outline && settings.text_outline_width > 0) {
      const outlineShadow = generateTextOutline(settings.text_outline_width, settings.text_outline_color);
      if (outlineShadow) shadows.push(outlineShadow);
    }
    
    if (settings.text_shadow) {
      shadows.push('2px 2px 4px rgba(0,0,0,0.5)');
      shadows.push('0 0 20px rgba(0,0,0,0.3)');
    }
    
    return shadows.length > 0 ? shadows.join(', ') : undefined;
  };

  const textShadowValue = buildTextShadow();

  const baseTextStyles: React.CSSProperties = {
    fontFamily,
    textShadow: textShadowValue,
  };

  const verseTextStyles: React.CSSProperties = {
    ...baseTextStyles,
    fontWeight: settings.verse_bold ? 'bold' : 'normal',
    fontStyle: settings.verse_italic ? 'italic' : 'normal',
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
          ...getPadding(),
        }}
      >
        {settings.logo_url && settings.logo_position !== 'none' && (
          <img
            src={settings.logo_url}
            alt="Logo"
            className={`absolute ${logoPositionClass}`}
            style={{ width: settings.logo_size, height: 'auto', objectFit: 'contain' }}
          />
        )}

        <div className="w-full" style={{ textAlign: settings.text_align as any }}>
          {/* Lyrics Only - No title, no part info, no artist */}
          <pre 
            className="leading-relaxed whitespace-pre-wrap"
            style={{ 
              ...verseTextStyles,
              fontSize: settings.verse_font_size,
              color: settings.verse_color,
            }}
          >
            {lyrics}
          </pre>
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

  // Render Scripture Display
  if (scriptureDisplay?.reference) {
    return (
      <div 
        className={`min-h-screen flex flex-col ${verticalAlignClass} relative`}
        style={{ 
          backgroundColor: settings.background_color,
          backgroundImage: settings.background_image_url ? `url(${settings.background_image_url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          ...getPadding(),
        }}
      >
        {settings.logo_url && settings.logo_position !== 'none' && (
          <img
            src={settings.logo_url}
            alt="Logo"
            className={`absolute ${logoPositionClass}`}
            style={{ width: settings.logo_size, height: 'auto', objectFit: 'contain' }}
          />
        )}

        <div className="w-full" style={{ textAlign: settings.text_align as any }}>
          {settings.reference_position === 'top' && (
            <h1 
              className="font-bold mb-6"
              style={{ 
                ...baseTextStyles,
                fontSize: settings.reference_font_size,
                color: settings.reference_color,
              }}
            >
              {scriptureDisplay.reference}
              {settings.show_translation && settings.translation_position === 'inline' && scriptureDisplay.translation && (
                <span 
                  style={{ 
                    fontSize: settings.translation_font_size,
                    color: settings.translation_color,
                    fontWeight: 'normal',
                  }}
                > ({scriptureDisplay.translation})</span>
              )}
            </h1>
          )}

          <p 
            className="leading-relaxed"
            style={{ 
              ...verseTextStyles,
              fontSize: settings.verse_font_size,
              color: settings.verse_color,
            }}
          >
            "{scriptureDisplay.verse_text}"
          </p>

          {settings.reference_position === 'bottom' && (
            <h1 
              className="font-bold mt-6"
              style={{ 
                ...baseTextStyles,
                fontSize: settings.reference_font_size,
                color: settings.reference_color,
              }}
            >
              {scriptureDisplay.reference}
              {settings.show_translation && settings.translation_position === 'inline' && scriptureDisplay.translation && (
                <span 
                  style={{ 
                    fontSize: settings.translation_font_size,
                    color: settings.translation_color,
                    fontWeight: 'normal',
                  }}
                > ({scriptureDisplay.translation})</span>
              )}
            </h1>
          )}

          {settings.show_translation && settings.translation_position === 'below' && scriptureDisplay.translation && (
            <p 
              className="mt-6 uppercase tracking-widest"
              style={{ 
                ...baseTextStyles,
                fontSize: settings.translation_font_size,
                color: settings.translation_color,
              }}
            >
              — {scriptureDisplay.translation} —
            </p>
          )}
        </div>

        {settings.show_translation && settings.translation_position === 'corner' && scriptureDisplay.translation && (
          <p 
            className="absolute bottom-6 right-6 uppercase tracking-widest"
            style={{ 
              ...baseTextStyles,
              fontSize: settings.translation_font_size,
              color: settings.translation_color,
            }}
          >
            {scriptureDisplay.translation}
          </p>
        )}

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
        ...getPadding(),
      }}
    >
      <div className="text-center">
        <h1 
          className="font-bold mb-4"
          style={{ ...baseTextStyles, color: settings.reference_color, fontSize: 48 }}
        >
          VerseCue
        </h1>
        <p style={{ ...baseTextStyles, color: settings.translation_color, fontSize: 24 }}>
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
