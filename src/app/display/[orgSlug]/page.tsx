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
  verse_bold: boolean;
  verse_italic: boolean;
  text_outline: boolean;
  text_outline_color: string;
  text_outline_width: number;
  text_shadow: boolean;
  min_font_size: number;
  auto_scale_enabled: boolean;
  split_word_threshold: number;
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
  min_font_size: 28,
  auto_scale_enabled: true,
  split_word_threshold: 70,
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
// Long Verse Handling Utilities
// ============================================

interface VersePart {
  text: string;
  partNumber: number;
  totalParts: number;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

function calculateFontSize(
  text: string,
  baseFontSize: number,
  minFontSize: number,
  autoScaleEnabled: boolean
): number {
  if (!autoScaleEnabled) return baseFontSize;
  
  const wordCount = countWords(text);
  
  // Thresholds for scaling
  if (wordCount <= 40) return baseFontSize;
  if (wordCount <= 60) return Math.max(minFontSize, baseFontSize * 0.85);
  if (wordCount <= 80) return Math.max(minFontSize, baseFontSize * 0.75);
  if (wordCount <= 100) return Math.max(minFontSize, baseFontSize * 0.65);
  
  // For very long verses, use minimum
  return minFontSize;
}

function splitVerse(text: string, threshold: number): VersePart[] {
  const wordCount = countWords(text);
  
  // Don't split if under threshold
  if (wordCount <= threshold) {
    return [{ text, partNumber: 1, totalParts: 1 }];
  }
  
  // Determine number of parts needed based on threshold
  const wordsPerPart = Math.min(threshold, 70); // Cap at 70 words per part
  let numParts = Math.ceil(wordCount / wordsPerPart);
  numParts = Math.min(numParts, 5); // Max 5 parts
  
  // Split at sentence boundaries preferably
  const sentences = text.split(/(?<=[.;!?])\s+/);
  const parts: VersePart[] = [];
  
  if (sentences.length >= numParts) {
    // Distribute sentences across parts
    const sentencesPerPart = Math.ceil(sentences.length / numParts);
    for (let i = 0; i < numParts; i++) {
      const start = i * sentencesPerPart;
      const end = Math.min(start + sentencesPerPart, sentences.length);
      const partText = sentences.slice(start, end).join(' ').trim();
      if (partText) {
        parts.push({
          text: partText,
          partNumber: parts.length + 1,
          totalParts: numParts,
        });
      }
    }
  } else {
    // Fall back to word-based splitting
    const words = text.split(/\s+/);
    const actualWordsPerPart = Math.ceil(words.length / numParts);
    for (let i = 0; i < numParts; i++) {
      const start = i * actualWordsPerPart;
      const end = Math.min(start + actualWordsPerPart, words.length);
      const partText = words.slice(start, end).join(' ').trim();
      if (partText) {
        parts.push({
          text: partText,
          partNumber: parts.length + 1,
          totalParts: numParts,
        });
      }
    }
  }
  
  // Update totalParts to actual count
  return parts.map(p => ({ ...p, totalParts: parts.length }));
}

function getTextStyles(settings: DisplaySettings): React.CSSProperties {
  const styles: React.CSSProperties = {};
  
  if (settings.verse_bold) {
    styles.fontWeight = 'bold';
  }
  
  if (settings.verse_italic) {
    styles.fontStyle = 'italic';
  }
  
  if (settings.text_shadow) {
    styles.textShadow = '2px 2px 4px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.3)';
  }
  
  if (settings.text_outline) {
    styles.WebkitTextStroke = `${settings.text_outline_width}px ${settings.text_outline_color}`;
    styles.paintOrder = 'stroke fill';
  }
  
  return styles;
}

function getPadding(settings: DisplaySettings): { top: number; right: number; bottom: number; left: number } {
  if (settings.padding_advanced) {
    return {
      top: settings.padding_top ?? settings.padding,
      right: settings.padding_right ?? settings.padding,
      bottom: settings.padding_bottom ?? settings.padding,
      left: settings.padding_left ?? settings.padding,
    };
  }
  return {
    top: settings.padding,
    right: settings.padding,
    bottom: settings.padding,
    left: settings.padding,
  };
}

export default function DisplayPage({ params }: { params: { orgSlug: string } }) {
  const [display, setDisplay] = useState<DisplayState | null>(null);
  const [settings, setSettings] = useState<DisplaySettings>(DEFAULT_SETTINGS);
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
          setSettings({
            verse_font_size: settingsData.verse_font_size ?? DEFAULT_SETTINGS.verse_font_size,
            verse_font_family: settingsData.verse_font_family ?? DEFAULT_SETTINGS.verse_font_family,
            verse_color: settingsData.verse_color ?? DEFAULT_SETTINGS.verse_color,
            verse_bold: settingsData.verse_bold ?? DEFAULT_SETTINGS.verse_bold,
            verse_italic: settingsData.verse_italic ?? DEFAULT_SETTINGS.verse_italic,
            text_outline: settingsData.text_outline ?? DEFAULT_SETTINGS.text_outline,
            text_outline_color: settingsData.text_outline_color ?? DEFAULT_SETTINGS.text_outline_color,
            text_outline_width: settingsData.text_outline_width ?? DEFAULT_SETTINGS.text_outline_width,
            text_shadow: settingsData.text_shadow ?? DEFAULT_SETTINGS.text_shadow,
            min_font_size: settingsData.min_font_size ?? DEFAULT_SETTINGS.min_font_size,
            auto_scale_enabled: settingsData.auto_scale_enabled ?? DEFAULT_SETTINGS.auto_scale_enabled,
            split_word_threshold: settingsData.split_word_threshold ?? DEFAULT_SETTINGS.split_word_threshold,
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
            padding_top: settingsData.padding_top ?? DEFAULT_SETTINGS.padding_top,
            padding_bottom: settingsData.padding_bottom ?? DEFAULT_SETTINGS.padding_bottom,
            padding_left: settingsData.padding_left ?? DEFAULT_SETTINGS.padding_left,
            padding_right: settingsData.padding_right ?? DEFAULT_SETTINGS.padding_right,
            padding_advanced: settingsData.padding_advanced ?? DEFAULT_SETTINGS.padding_advanced,
            logo_url: settingsData.logo_url,
            logo_position: settingsData.logo_position ?? DEFAULT_SETTINGS.logo_position,
            logo_size: settingsData.logo_size ?? DEFAULT_SETTINGS.logo_size,
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
        () => {
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

  const logoPositionClass = {
    'top-left': 'top-6 left-6',
    'top-right': 'top-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'bottom-right': 'bottom-6 right-6',
  }[settings.logo_position] || '';

  return (
    <div 
      className={`min-h-screen flex flex-col ${verticalAlignClass} relative`}
      style={{ 
        backgroundColor: settings.background_color,
        backgroundImage: settings.background_image_url ? `url(${settings.background_image_url})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        paddingTop: getPadding(settings).top,
        paddingRight: getPadding(settings).right,
        paddingBottom: getPadding(settings).bottom,
        paddingLeft: getPadding(settings).left,
      }}
    >
      {/* Logo */}
      {settings.logo_url && settings.logo_position !== 'none' && (
        <img
          src={settings.logo_url}
          alt="Logo"
          className={`absolute ${logoPositionClass}`}
          style={{ 
            width: settings.logo_size,
            height: 'auto',
            objectFit: 'contain',
          }}
        />
      )}

      {display?.reference ? (
        <div 
          className="w-full"
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
              {settings.show_translation && settings.translation_position === 'inline' && display.translation && (
                <span style={{ color: settings.translation_color, fontSize: settings.translation_font_size, fontWeight: 'normal' }}> ({display.translation})</span>
              )}
            </h1>
          )}

          {/* Verse Text with Auto-scaling */}
          {display.verse_text && (() => {
            const parts = splitVerse(display.verse_text, settings.split_word_threshold);
            const fontSize = calculateFontSize(
              display.verse_text,
              settings.verse_font_size,
              settings.min_font_size,
              settings.auto_scale_enabled
            );
            const textStyles = getTextStyles(settings);
            
            // For now, show first part (multi-part navigation can be added later)
            const currentPart = parts[0];
            const showPartIndicator = parts.length > 1;
            
            return (
              <div className="relative">
                <p 
                  className={`${fontFamilyClass} leading-relaxed`}
                  style={{ 
                    fontSize,
                    color: settings.verse_color,
                    textAlign: settings.text_align as any,
                    ...textStyles,
                  }}
                >
                  "{currentPart.text}"
                </p>
{/* Part indicator removed - shown only in operator control panel */}
              </div>
            );
          })()}

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
              {settings.show_translation && settings.translation_position === 'inline' && display.translation && (
                <span style={{ color: settings.translation_color, fontSize: settings.translation_font_size, fontWeight: 'normal' }}> ({display.translation})</span>
              )}
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
