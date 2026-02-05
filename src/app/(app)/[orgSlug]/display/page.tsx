"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useOrg } from '@/contexts/OrgContext';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { 
  Monitor, 
  Type, 
  Palette, 
  Layout, 
  Image as ImageIcon,
  Loader2,
  Check,
  ExternalLink,
  RotateCcw,
  Save,
  ChevronDown,
  ChevronUp,
  Upload,
  X,
  Link as LinkIcon
} from 'lucide-react';
import Link from 'next/link';

// Constants
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

// Color presets for quick selection
const COLOR_PRESETS = [
  { name: 'White', value: '#ffffff' },
  { name: 'Black', value: '#000000' },
  { name: 'Gold', value: '#fbbf24' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Gray', value: '#9ca3af' },
  { name: 'Cream', value: '#fef3c7' },
  { name: 'Navy', value: '#1e1b4b' },
  { name: 'Dark', value: '#1f2937' },
];

// Theme presets
const THEME_PRESETS = {
  classic: {
    name: 'Classic',
    verse_color: '#ffffff',
    reference_color: '#fbbf24',
    translation_color: '#9ca3af',
    background_color: '#000000',
    verse_font_family: 'serif',
  },
  modern: {
    name: 'Modern',
    verse_color: '#ffffff',
    reference_color: '#3b82f6',
    translation_color: '#9ca3af',
    background_color: '#1f2937',
    verse_font_family: 'sans',
  },
  minimal: {
    name: 'Minimal',
    verse_color: '#1f2937',
    reference_color: '#6b7280',
    translation_color: '#9ca3af',
    background_color: '#ffffff',
    verse_font_family: 'sans',
  },
  elegant: {
    name: 'Elegant',
    verse_color: '#fef3c7',
    reference_color: '#d4af37',
    translation_color: '#a78bfa',
    background_color: '#1e1b4b',
    verse_font_family: 'serif',
  },
  'high-contrast': {
    name: 'High Contrast',
    verse_color: '#fef08a',
    reference_color: '#ffffff',
    translation_color: '#d1d5db',
    background_color: '#000000',
    verse_font_family: 'sans',
  },
};

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
  theme_preset: string;
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
  theme_preset: 'classic',
};

// ============================================
// Helper: Generate text outline using text-shadow
// Creates clean outline without WebkitTextStroke artifacts
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
  
  // Add inner layer for thicker outlines
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

// Collapsible Section Component
function Section({ 
  title, 
  icon: Icon, 
  children, 
  defaultOpen = true 
}: { 
  title: string; 
  icon: any; 
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-verse-surface border border-verse-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-verse-elevated transition-colors"
      >
        <h2 className="font-semibold text-verse-text flex items-center gap-2">
          <Icon className="w-5 h-5 text-gold-500" />
          {title}
        </h2>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-verse-muted" />
        ) : (
          <ChevronDown className="w-5 h-5 text-verse-muted" />
        )}
      </button>
      {isOpen && (
        <div className="px-6 pb-6 pt-2 border-t border-verse-border">
          {children}
        </div>
      )}
    </div>
  );
}

// Color picker component with presets AND wheel
function ColorPicker({ 
  value, 
  onChange, 
  label 
}: { 
  value: string; 
  onChange: (val: string) => void;
  label: string;
}) {
  return (
    <div>
      <label className="block text-sm text-verse-muted mb-2">{label}</label>
      <div className="space-y-3">
        {/* Color wheel + hex input */}
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-12 h-10 rounded-lg cursor-pointer border-2 border-verse-border"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 px-3 py-2 bg-verse-bg border border-verse-border rounded-lg text-verse-text font-mono text-sm"
            placeholder="#ffffff"
          />
        </div>
        
        {/* Preset colors */}
        <div className="flex flex-wrap gap-1.5">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => onChange(preset.value)}
              className={`w-6 h-6 rounded border-2 transition-all ${
                value.toLowerCase() === preset.value.toLowerCase()
                  ? 'border-gold-500 scale-110'
                  : 'border-transparent hover:border-verse-muted'
              }`}
              style={{ backgroundColor: preset.value }}
              title={preset.name}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Image Upload Component
function ImageUpload({
  label,
  value,
  onChange,
  orgSlug,
  folder,
}: {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  orgSlug: string;
  folder: 'backgrounds' | 'logos';
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('File size must be less than 2MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('File must be an image');
      return;
    }

    setUploading(true);

    try {
      // Generate unique filename
      const ext = file.name.split('.').pop();
      const filename = `${orgSlug}/${folder}/${Date.now()}.${ext}`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('org-assets')
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('org-assets')
        .getPublicUrl(filename);

      onChange(publicUrl);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setUrlInput('');
      setShowUrlInput(false);
    }
  };

  const handleRemove = async () => {
    // If it's a Supabase URL, try to delete the file
    if (value?.includes('org-assets')) {
      try {
        const path = value.split('org-assets/')[1];
        if (path) {
          await supabase.storage.from('org-assets').remove([path]);
        }
      } catch (err) {
        console.error('Failed to delete file:', err);
      }
    }
    onChange(null);
  };

  return (
    <div>
      <label className="block text-sm text-verse-muted mb-2">{label}</label>
      
      {value ? (
        <div className="relative">
          <div className="relative aspect-video rounded-lg overflow-hidden bg-verse-bg border border-verse-border">
            <img 
              src={value} 
              alt={label}
              className="w-full h-full object-cover"
            />
          </div>
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-verse-border rounded-xl text-verse-muted hover:text-verse-text hover:border-verse-muted transition-colors"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
            {uploading ? 'Uploading...' : 'Upload Image (max 2MB)'}
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* URL option */}
          {showUrlInput ? (
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="flex-1 px-3 py-2 bg-verse-bg border border-verse-border rounded-lg text-verse-text text-sm"
              />
              <button
                onClick={handleUrlSubmit}
                className="px-3 py-2 bg-gold-500 text-verse-bg rounded-lg hover:bg-gold-400"
              >
                Add
              </button>
              <button
                onClick={() => setShowUrlInput(false)}
                className="px-3 py-2 border border-verse-border text-verse-muted rounded-lg hover:bg-verse-surface"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowUrlInput(true)}
              className="flex items-center gap-2 text-sm text-verse-muted hover:text-verse-text"
            >
              <LinkIcon className="w-4 h-4" />
              Or paste image URL
            </button>
          )}

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function DisplaySettingsPage() {
  const { org, loading: orgLoading } = useOrg();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [settings, setSettings] = useState<DisplaySettings>(DEFAULT_SETTINGS);
  const [currentVerse, setCurrentVerse] = useState<{ reference: string; text: string; translation: string } | null>(null);
  const [savedSettings, setSavedSettings] = useState<DisplaySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings
  useEffect(() => {
    if (!org) return;

    const loadSettings = async () => {
      const { data, error } = await supabase
        .from('display_settings')
        .select('*')
        .eq('organization_id', org.id)
        .single();

      if (data) {
        const loaded: DisplaySettings = {
          verse_font_size: data.verse_font_size ?? DEFAULT_SETTINGS.verse_font_size,
          verse_font_family: data.verse_font_family ?? DEFAULT_SETTINGS.verse_font_family,
          verse_color: data.verse_color ?? DEFAULT_SETTINGS.verse_color,
          verse_bold: data.verse_bold ?? DEFAULT_SETTINGS.verse_bold,
          verse_italic: data.verse_italic ?? DEFAULT_SETTINGS.verse_italic,
          text_outline: data.text_outline ?? DEFAULT_SETTINGS.text_outline,
          text_outline_color: data.text_outline_color ?? DEFAULT_SETTINGS.text_outline_color,
          text_outline_width: data.text_outline_width ?? DEFAULT_SETTINGS.text_outline_width,
          text_shadow: data.text_shadow ?? DEFAULT_SETTINGS.text_shadow,
          min_font_size: data.min_font_size ?? DEFAULT_SETTINGS.min_font_size,
          auto_scale_enabled: data.auto_scale_enabled ?? DEFAULT_SETTINGS.auto_scale_enabled,
          split_word_threshold: data.split_word_threshold ?? DEFAULT_SETTINGS.split_word_threshold,
          reference_font_size: data.reference_font_size ?? DEFAULT_SETTINGS.reference_font_size,
          reference_color: data.reference_color ?? DEFAULT_SETTINGS.reference_color,
          reference_position: data.reference_position ?? DEFAULT_SETTINGS.reference_position,
          translation_font_size: data.translation_font_size ?? DEFAULT_SETTINGS.translation_font_size,
          translation_color: data.translation_color ?? DEFAULT_SETTINGS.translation_color,
          translation_position: data.translation_position ?? DEFAULT_SETTINGS.translation_position,
          show_translation: data.show_translation ?? DEFAULT_SETTINGS.show_translation,
          background_color: data.background_color ?? DEFAULT_SETTINGS.background_color,
          background_image_url: data.background_image_url,
          text_align: data.text_align ?? DEFAULT_SETTINGS.text_align,
          vertical_align: data.vertical_align ?? DEFAULT_SETTINGS.vertical_align,
          padding: data.padding ?? DEFAULT_SETTINGS.padding,
          padding_top: data.padding_top ?? DEFAULT_SETTINGS.padding_top,
          padding_bottom: data.padding_bottom ?? DEFAULT_SETTINGS.padding_bottom,
          padding_left: data.padding_left ?? DEFAULT_SETTINGS.padding_left,
          padding_right: data.padding_right ?? DEFAULT_SETTINGS.padding_right,
          padding_advanced: data.padding_advanced ?? DEFAULT_SETTINGS.padding_advanced,
          logo_url: data.logo_url,
          logo_position: data.logo_position ?? DEFAULT_SETTINGS.logo_position,
          logo_size: data.logo_size ?? DEFAULT_SETTINGS.logo_size,
          show_watermark: data.show_watermark ?? DEFAULT_SETTINGS.show_watermark,
          theme_preset: data.theme_preset ?? DEFAULT_SETTINGS.theme_preset,
        };
        setSettings(loaded);
        setSavedSettings(loaded);
      }
      setLoading(false);
    };

    loadSettings();
  }, [org]);

  // Fetch current verse from display_state for preview
  useEffect(() => {
    if (!org) return;
    
    const fetchCurrentVerse = async () => {
      const { data: displayState } = await supabase
        .from('display_state')
        .select('reference, verse_text, translation')
        .eq('id', org.slug)
        .single();
      
      if (displayState?.verse_text) {
        setCurrentVerse({
          reference: displayState.reference || 'John 3:16',
          text: displayState.verse_text,
          translation: displayState.translation || 'KJV',
        });
      }
    };
    fetchCurrentVerse();
    
    // Subscribe to realtime verse changes
    const verseChannel = supabase
      .channel('settings-verse-preview')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'display_state',
          filter: `id=eq.${org.slug}`,
        },
        (payload: any) => {
          if (payload.new?.verse_text) {
            setCurrentVerse({
              reference: payload.new.reference || 'John 3:16',
              text: payload.new.verse_text,
              translation: payload.new.translation || 'KJV',
            });
          } else {
            setCurrentVerse(null);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(verseChannel);
    };
  }, [org, supabase]);

  // Track changes
  useEffect(() => {
    setHasChanges(JSON.stringify(settings) !== JSON.stringify(savedSettings));
  }, [settings, savedSettings]);

  // Update local setting
  const updateSetting = <K extends keyof DisplaySettings>(key: K, value: DisplaySettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Save all settings
  const saveSettings = async () => {
    if (!org) return;
    setSaving(true);

    const { error } = await supabase
      .from('display_settings')
      .update({
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', org.id);

    setSaving(false);
    if (!error) {
      setSavedSettings(settings);
      setHasChanges(false);
    }
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  // Revert to saved
  const revertChanges = () => {
    setSettings(savedSettings);
  };

  // Apply theme preset
  const applyPreset = (presetKey: string) => {
    const preset = THEME_PRESETS[presetKey as keyof typeof THEME_PRESETS];
    if (!preset) return;

    setSettings(prev => ({
      ...prev,
      verse_color: preset.verse_color,
      reference_color: preset.reference_color,
      translation_color: preset.translation_color,
      background_color: preset.background_color,
      verse_font_family: preset.verse_font_family,
      theme_preset: presetKey,
    }));
  };

  if (authLoading || orgLoading || loading) {
    return (
      <div className="min-h-screen bg-verse-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  if (!org) {
    router.push('/dashboard');
    return null;
  }

  const fontFamilyClass = {
    serif: 'font-serif',
    sans: 'font-sans',
    mono: 'font-mono',
  }[settings.verse_font_family] || 'font-serif';

  const verticalAlignStyle = {
    top: 'justify-start pt-4',
    center: 'justify-center',
    bottom: 'justify-end pb-4',
  }[settings.vertical_align] || 'justify-center';

  // Font family for inline styles
  const fontFamily = {
    serif: 'Georgia, "Times New Roman", serif',
    sans: 'system-ui, -apple-system, sans-serif',
    mono: '"Courier New", monospace',
  }[settings.verse_font_family] || 'Georgia, "Times New Roman", serif';

  // Build text shadow (combines outline + drop shadow) - scaled for preview
  const buildPreviewTextShadow = (): string | undefined => {
    const shadows: string[] = [];
    
    // Add outline shadows (scaled by /3 for preview)
    if (settings.text_outline && settings.text_outline_width > 0) {
      const scaledWidth = settings.text_outline_width / 3;
      const outlineShadow = generateTextOutline(scaledWidth, settings.text_outline_color);
      if (outlineShadow) shadows.push(outlineShadow);
    }
    
    // Add drop shadow
    if (settings.text_shadow) {
      shadows.push('1px 1px 2px rgba(0,0,0,0.5)');
    }
    
    return shadows.length > 0 ? shadows.join(', ') : undefined;
  };

  const previewTextShadow = buildPreviewTextShadow();

  // Base text styles for preview (applied to all text)
  const basePreviewStyles: React.CSSProperties = {
    fontFamily,
    textShadow: previewTextShadow,
  };

  return (
    <div className="min-h-screen bg-verse-bg">
      {/* Action Bar */}
      <div className="sticky top-16 z-10 bg-verse-bg/95 backdrop-blur border-b border-verse-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <h1 className="font-display text-lg font-bold text-verse-text">Display Settings</h1>
          
          <div className="flex items-center gap-2">
            {hasChanges && (
              <button
                onClick={revertChanges}
                className="px-3 py-1.5 text-sm text-verse-muted hover:text-verse-text transition-colors"
              >
                Discard
              </button>
            )}
            <button
              onClick={resetToDefaults}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-verse-border text-verse-muted hover:text-verse-text rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button
              onClick={saveSettings}
              disabled={!hasChanges || saving}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                hasChanges 
                  ? 'bg-gold-500 text-verse-bg hover:bg-gold-400' 
                  : 'bg-verse-border text-verse-muted cursor-not-allowed'
              }`}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : hasChanges ? (
                <Save className="w-4 h-4" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {saving ? 'Saving...' : hasChanges ? 'Save' : 'Saved'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Settings Panel */}
          <div className="space-y-4">
            {/* Theme Presets */}
            <Section title="Theme Presets" icon={Palette} defaultOpen={true}>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {Object.entries(THEME_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => applyPreset(key)}
                    className={`p-2 rounded-xl border-2 transition-all ${
                      settings.theme_preset === key
                        ? 'border-gold-500 bg-gold-500/10'
                        : 'border-verse-border hover:border-verse-muted'
                    }`}
                  >
                    <div 
                      className="w-full h-6 rounded-lg mb-1"
                      style={{ backgroundColor: preset.background_color }}
                    >
                      <div className="flex items-center justify-center h-full">
                        <span style={{ color: preset.reference_color, fontSize: 9, fontWeight: 'bold' }}>Aa</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-verse-text">{preset.name}</span>
                  </button>
                ))}
              </div>
            </Section>

            {/* Reference */}
            <Section title="Reference (e.g. John 3:16)" icon={Type} defaultOpen={true}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-verse-muted mb-2">Position</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'top', label: 'Top' },
                      { value: 'bottom', label: 'Bottom' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => updateSetting('reference_position', opt.value)}
                        className={`flex-1 py-2 px-3 rounded-xl border-2 transition-all text-sm ${
                          settings.reference_position === opt.value
                            ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                            : 'border-verse-border text-verse-muted hover:border-verse-muted'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-verse-muted mb-2">Size: {settings.reference_font_size}px</label>
                  <input
                    type="range"
                    min="24"
                    max="120"
                    value={settings.reference_font_size}
                    onChange={(e) => updateSetting('reference_font_size', parseInt(e.target.value))}
                    className="w-full accent-gold-500"
                  />
                </div>
                <ColorPicker
                  label="Color"
                  value={settings.reference_color}
                  onChange={(val) => updateSetting('reference_color', val)}
                />
              </div>
            </Section>

            {/* Verse Text */}
            <Section title="Verse Text" icon={Type} defaultOpen={false}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-verse-muted mb-2">Size: {settings.verse_font_size}px</label>
                  <input
                    type="range"
                    min="24"
                    max="96"
                    value={settings.verse_font_size}
                    onChange={(e) => updateSetting('verse_font_size', parseInt(e.target.value))}
                    className="w-full accent-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-verse-muted mb-2">Minimum Size (for auto-scaling): {settings.min_font_size}px</label>
                  <input
                    type="range"
                    min="20"
                    max="40"
                    value={settings.min_font_size}
                    onChange={(e) => updateSetting('min_font_size', parseInt(e.target.value))}
                    className="w-full accent-gold-500"
                  />
                  <p className="text-xs text-verse-muted mt-1">Long verses will scale down to this minimum before splitting</p>
                </div>
                <div>
                  <label className="block text-sm text-verse-muted mb-2">Split Threshold: {settings.split_word_threshold} words</label>
                  <input
                    type="range"
                    min="30"
                    max="120"
                    step="5"
                    value={settings.split_word_threshold}
                    onChange={(e) => updateSetting('split_word_threshold', parseInt(e.target.value))}
                    className="w-full accent-gold-500"
                  />
                  <p className="text-xs text-verse-muted mt-1">Verses longer than this will split into multiple parts</p>
                </div>
                <div>
                  <label className="block text-sm text-verse-muted mb-2">Font</label>
                  <select
                    value={settings.verse_font_family}
                    onChange={(e) => updateSetting('verse_font_family', e.target.value)}
                    className="w-full px-3 py-2 bg-verse-bg border border-verse-border rounded-xl text-verse-text"
                  >
                    <option value="serif">Serif</option>
                    <option value="sans">Sans-serif</option>
                    <option value="mono">Monospace</option>
                  </select>
                </div>
                <ColorPicker
                  label="Color"
                  value={settings.verse_color}
                  onChange={(val) => updateSetting('verse_color', val)}
                />
                
                {/* Text Styles */}
                <div className="pt-2 border-t border-verse-border">
                  <label className="block text-sm text-verse-muted mb-3">Text Styles</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => updateSetting('verse_bold', !settings.verse_bold)}
                      className={`flex-1 py-2 px-3 rounded-xl border-2 transition-all text-sm font-bold ${
                        settings.verse_bold
                          ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                          : 'border-verse-border text-verse-muted hover:border-verse-muted'
                      }`}
                    >
                      Bold
                    </button>
                    <button
                      onClick={() => updateSetting('verse_italic', !settings.verse_italic)}
                      className={`flex-1 py-2 px-3 rounded-xl border-2 transition-all text-sm italic ${
                        settings.verse_italic
                          ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                          : 'border-verse-border text-verse-muted hover:border-verse-muted'
                      }`}
                    >
                      Italic
                    </button>
                  </div>
                </div>
                
                {/* Text Effects */}
                <div className="pt-2 border-t border-verse-border">
                  <label className="block text-sm text-verse-muted mb-3">Text Effects</label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-verse-text">Text Shadow</span>
                        <p className="text-xs text-verse-muted">Adds depth, good for readability</p>
                      </div>
                      <button
                        onClick={() => updateSetting('text_shadow', !settings.text_shadow)}
                        className={`w-11 h-6 rounded-full transition-colors ${
                          settings.text_shadow ? 'bg-gold-500' : 'bg-verse-border'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          settings.text_shadow ? 'translate-x-5' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-verse-text">Text Outline</span>
                        <p className="text-xs text-verse-muted">Best for busy backgrounds</p>
                      </div>
                      <button
                        onClick={() => updateSetting('text_outline', !settings.text_outline)}
                        className={`w-11 h-6 rounded-full transition-colors ${
                          settings.text_outline ? 'bg-gold-500' : 'bg-verse-border'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          settings.text_outline ? 'translate-x-5' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                    {settings.text_outline && (
                      <>
                        <div>
                          <label className="block text-sm text-verse-muted mb-2">Outline Width: {settings.text_outline_width}px</label>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={settings.text_outline_width}
                            onChange={(e) => updateSetting('text_outline_width', parseInt(e.target.value))}
                            className="w-full accent-gold-500"
                          />
                        </div>
                        <ColorPicker
                          label="Outline Color"
                          value={settings.text_outline_color}
                          onChange={(val) => updateSetting('text_outline_color', val)}
                        />
                      </>
                    )}
                  </div>
                </div>
                
                {/* Auto-scale toggle */}
                <div className="pt-2 border-t border-verse-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-verse-text">Auto-scale Long Verses</span>
                      <p className="text-xs text-verse-muted">Automatically reduce font for long verses</p>
                    </div>
                    <button
                      onClick={() => updateSetting('auto_scale_enabled', !settings.auto_scale_enabled)}
                      className={`w-11 h-6 rounded-full transition-colors ${
                        settings.auto_scale_enabled ? 'bg-gold-500' : 'bg-verse-border'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        settings.auto_scale_enabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            </Section>

            {/* Translation */}
            <Section title="Translation Label" icon={Type} defaultOpen={false}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-verse-muted">Show Translation</label>
                  <button
                    onClick={() => updateSetting('show_translation', !settings.show_translation)}
                    className={`w-11 h-6 rounded-full transition-colors ${
                      settings.show_translation ? 'bg-gold-500' : 'bg-verse-border'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      settings.show_translation ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
                {settings.show_translation && (
                  <>
                    <div>
                      <label className="block text-sm text-verse-muted mb-2">Position</label>
                      <div className="flex gap-2">
                        {[
                          { value: 'below', label: 'Below Verse' },
                          { value: 'corner', label: 'Corner' },
                          { value: 'inline', label: 'Inline (John 3:16 KJV)' },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => updateSetting('translation_position', opt.value)}
                            className={`flex-1 py-2 px-3 rounded-xl border-2 transition-all text-sm ${
                              settings.translation_position === opt.value
                                ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                                : 'border-verse-border text-verse-muted hover:border-verse-muted'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-verse-muted mb-2">Size: {settings.translation_font_size}px</label>
                      <input
                        type="range"
                        min="12"
                        max="72"
                        value={settings.translation_font_size}
                        onChange={(e) => updateSetting('translation_font_size', parseInt(e.target.value))}
                        className="w-full accent-gold-500"
                      />
                    </div>
                    <ColorPicker
                      label="Color"
                      value={settings.translation_color}
                      onChange={(val) => updateSetting('translation_color', val)}
                    />
                  </>
                )}
              </div>
            </Section>

            {/* Background */}
            <Section title="Background" icon={ImageIcon} defaultOpen={false}>
              <div className="space-y-4">
                <ColorPicker
                  label="Color"
                  value={settings.background_color}
                  onChange={(val) => updateSetting('background_color', val)}
                />
                <ImageUpload
                  label="Background Image (optional)"
                  value={settings.background_image_url}
                  onChange={(url) => updateSetting('background_image_url', url)}
                  orgSlug={org.slug}
                  folder="backgrounds"
                />
              </div>
            </Section>

            {/* Logo */}
            <Section title="Church Logo" icon={ImageIcon} defaultOpen={false}>
              <div className="space-y-4">
                <ImageUpload
                  label="Logo Image"
                  value={settings.logo_url}
                  onChange={(url) => updateSetting('logo_url', url)}
                  orgSlug={org.slug}
                  folder="logos"
                />
                {settings.logo_url && (
                  <>
                    <div>
                      <label className="block text-sm text-verse-muted mb-2">Position</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: 'none', label: 'Hidden' },
                          { value: 'top-left', label: 'Top Left' },
                          { value: 'top-right', label: 'Top Right' },
                          { value: 'bottom-left', label: 'Bottom Left' },
                          { value: 'bottom-right', label: 'Bottom Right' },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => updateSetting('logo_position', opt.value)}
                            className={`py-2 px-3 rounded-xl border-2 transition-all text-sm ${
                              settings.logo_position === opt.value
                                ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                                : 'border-verse-border text-verse-muted hover:border-verse-muted'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-verse-muted mb-2">Size: {settings.logo_size}px</label>
                      <input
                        type="range"
                        min="40"
                        max="200"
                        value={settings.logo_size}
                        onChange={(e) => updateSetting('logo_size', parseInt(e.target.value))}
                        className="w-full accent-gold-500"
                      />
                    </div>
                  </>
                )}
              </div>
            </Section>

            {/* Layout */}
            <Section title="Layout" icon={Layout} defaultOpen={false}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-verse-muted mb-2">Horizontal Alignment</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['left', 'center', 'right', 'justify'].map((align) => (
                      <button
                        key={align}
                        onClick={() => updateSetting('text_align', align)}
                        className={`py-2 px-3 rounded-xl border-2 transition-all capitalize text-sm ${
                          settings.text_align === align
                            ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                            : 'border-verse-border text-verse-muted hover:border-verse-muted'
                        }`}
                      >
                        {align}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-verse-muted mb-2">Vertical Alignment</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'top', label: 'Top' },
                      { value: 'center', label: 'Center' },
                      { value: 'bottom', label: 'Bottom' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => updateSetting('vertical_align', opt.value)}
                        className={`flex-1 py-2 px-3 rounded-xl border-2 transition-all text-sm ${
                          settings.vertical_align === opt.value
                            ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                            : 'border-verse-border text-verse-muted hover:border-verse-muted'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Padding Controls */}
                <div className="pt-2 border-t border-verse-border">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-verse-muted">Content Padding</label>
                    <button
                      onClick={() => updateSetting('padding_advanced', !settings.padding_advanced)}
                      className="text-xs text-gold-400 hover:text-gold-300"
                    >
                      {settings.padding_advanced ? '← Simple' : 'Advanced →'}
                    </button>
                  </div>
                  
                  {!settings.padding_advanced ? (
                    <div>
                      <label className="block text-xs text-verse-muted mb-1">All Sides: {settings.padding}px</label>
                      <input
                        type="range"
                        min="0"
                        max="128"
                        value={settings.padding}
                        onChange={(e) => updateSetting('padding', parseInt(e.target.value))}
                        className="w-full accent-gold-500"
                      />
                      <p className="text-xs text-verse-muted mt-1">Set to 0 to fill the screen</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-verse-muted mb-1">Top: {settings.padding_top ?? settings.padding}px</label>
                        <input
                          type="range"
                          min="0"
                          max="128"
                          value={settings.padding_top ?? settings.padding}
                          onChange={(e) => updateSetting('padding_top', parseInt(e.target.value))}
                          className="w-full accent-gold-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-verse-muted mb-1">Bottom: {settings.padding_bottom ?? settings.padding}px</label>
                        <input
                          type="range"
                          min="0"
                          max="128"
                          value={settings.padding_bottom ?? settings.padding}
                          onChange={(e) => updateSetting('padding_bottom', parseInt(e.target.value))}
                          className="w-full accent-gold-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-verse-muted mb-1">Left: {settings.padding_left ?? settings.padding}px</label>
                        <input
                          type="range"
                          min="0"
                          max="128"
                          value={settings.padding_left ?? settings.padding}
                          onChange={(e) => updateSetting('padding_left', parseInt(e.target.value))}
                          className="w-full accent-gold-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-verse-muted mb-1">Right: {settings.padding_right ?? settings.padding}px</label>
                        <input
                          type="range"
                          min="0"
                          max="128"
                          value={settings.padding_right ?? settings.padding}
                          onChange={(e) => updateSetting('padding_right', parseInt(e.target.value))}
                          className="w-full accent-gold-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Section>

            {/* Watermark */}
            <Section title="Watermark" icon={Type} defaultOpen={false}>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm text-verse-text">Show "Powered by VerseCue"</label>
                  <p className="text-xs text-verse-muted mt-0.5">Free plans display watermark</p>
                </div>
                <button
                  onClick={() => updateSetting('show_watermark', !settings.show_watermark)}
                  className={`w-11 h-6 rounded-full transition-colors ${
                    settings.show_watermark ? 'bg-gold-500' : 'bg-verse-border'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    settings.show_watermark ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </Section>
          </div>

          {/* Live Preview */}
          <div className="lg:sticky lg:top-24 h-fit">
            <div className="bg-verse-surface border border-verse-border rounded-2xl p-4 sm:p-6">
              <h2 className="font-semibold text-verse-text mb-4 flex items-center gap-2">
                <Monitor className="w-5 h-5 text-gold-500" />
                Live Preview
              </h2>
              <div 
                className={`relative aspect-video rounded-xl overflow-hidden flex flex-col ${verticalAlignStyle}`}
                style={{ 
                  backgroundColor: settings.background_color,
                  backgroundImage: settings.background_image_url ? `url(${settings.background_image_url})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  padding: settings.padding / 3,
                }}
              >
                {/* Logo */}
                {settings.logo_url && settings.logo_position !== 'none' && (
                  <img
                    src={settings.logo_url}
                    alt="Logo"
                    className={`absolute ${
                      settings.logo_position === 'top-left' ? 'top-2 left-2' :
                      settings.logo_position === 'top-right' ? 'top-2 right-2' :
                      settings.logo_position === 'bottom-left' ? 'bottom-2 left-2' :
                      'bottom-2 right-2'
                    }`}
                    style={{ 
                      width: settings.logo_size / 3,
                      height: 'auto',
                      objectFit: 'contain',
                    }}
                  />
                )}

                <div 
                  className="flex flex-col w-full"
                  style={{ textAlign: settings.text_align as any }}
                >
                  {/* Reference - Top */}
                  {settings.reference_position === 'top' && (
                    <h2 
                      className="font-bold mb-1"
                      style={{ 
                        ...basePreviewStyles,
                        fontSize: settings.reference_font_size / 3,
                        color: settings.reference_color,
                      }}
                    >
                      John 3:16
                      {settings.show_translation && settings.translation_position === 'inline' && (
                        <span style={{ color: settings.translation_color, fontSize: settings.translation_font_size / 3, fontWeight: 'normal' }}> (KJV)</span>
                      )}
                    </h2>
                  )}

                  {/* Verse Text */}
                  <p 
                    className={`${fontFamilyClass} leading-relaxed`}
                    style={{ 
                      ...basePreviewStyles,
                      fontSize: settings.verse_font_size / 3,
                      color: settings.verse_color,
                      fontWeight: settings.verse_bold ? 'bold' : 'normal',
                      fontStyle: settings.verse_italic ? 'italic' : 'normal',
                      textAlign: settings.text_align as any,
                    }}
                  >
                    {currentVerse?.text ? `"${currentVerse.text}"` : '"For God so loved the world, that he gave his only begotten Son..."'}
                  </p>

                  {/* Reference - Bottom */}
                  {settings.reference_position === 'bottom' && (
                    <h2 
                      className="font-bold mt-1"
                      style={{ 
                        ...basePreviewStyles,
                        fontSize: settings.reference_font_size / 3,
                        color: settings.reference_color,
                      }}
                    >
                      {currentVerse?.reference || 'John 3:16'}
                      {settings.show_translation && settings.translation_position === 'inline' && (
                        <span style={{ color: settings.translation_color, fontSize: settings.translation_font_size / 3, fontWeight: 'normal' }}> ({currentVerse?.translation || 'KJV'})</span>
                      )}
                    </h2>
                  )}

                  {/* Translation - Below */}
                  {settings.show_translation && settings.translation_position === 'below' && (
                    <p 
                      className="mt-1 uppercase tracking-widest"
                      style={{ 
                        ...basePreviewStyles,
                        fontSize: settings.translation_font_size / 3,
                        color: settings.translation_color,
                      }}
                    >
                      — KJV —
                    </p>
                  )}
                </div>

                {/* Translation - Corner */}
                {settings.show_translation && settings.translation_position === 'corner' && (
                  <p 
                    className="absolute bottom-2 right-2 uppercase tracking-widest"
                    style={{ 
                      ...basePreviewStyles,
                      fontSize: settings.translation_font_size / 3,
                      color: settings.translation_color,
                    }}
                  >
                    KJV
                  </p>
                )}

                {/* Watermark */}
                {settings.show_watermark && (
                  <div 
                    className="absolute bottom-1 left-2 opacity-50"
                    style={{ color: settings.translation_color, fontSize: 6 }}
                  >
                    Powered by VerseCue
                  </div>
                )}
              </div>
              
              <p className="text-xs text-verse-muted mt-4 text-center">
                <code className="text-gold-400">versecue.app/display/{org.slug}</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
