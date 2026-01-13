"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrg } from '@/contexts/OrgContext';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { 
  ArrowLeft, 
  Monitor, 
  Type, 
  Palette, 
  Layout, 
  Image,
  Loader2,
  Check,
  ExternalLink,
  RotateCcw,
  Save
} from 'lucide-react';
import Link from 'next/link';

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
  theme_preset: string;
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
  theme_preset: 'classic',
};

// Color picker component with presets
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
      <div className="space-y-2">
        {/* Preset colors */}
        <div className="flex flex-wrap gap-1.5">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => onChange(preset.value)}
              className={`w-7 h-7 rounded-lg border-2 transition-all ${
                value.toLowerCase() === preset.value.toLowerCase()
                  ? 'border-gold-500 scale-110'
                  : 'border-transparent hover:border-verse-muted'
              }`}
              style={{ backgroundColor: preset.value }}
              title={preset.name}
            />
          ))}
        </div>
        {/* Custom color input */}
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-10 h-8 rounded cursor-pointer border-0"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 px-3 py-1.5 bg-verse-bg border border-verse-border rounded-lg text-verse-text font-mono text-sm"
          />
        </div>
      </div>
    </div>
  );
}

export default function DisplaySettingsPage() {
  const { org, loading: orgLoading } = useOrg();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [settings, setSettings] = useState<DisplaySettings>(DEFAULT_SETTINGS);
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
          logo_url: data.logo_url,
          logo_position: data.logo_position ?? DEFAULT_SETTINGS.logo_position,
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

  // Track changes
  useEffect(() => {
    setHasChanges(JSON.stringify(settings) !== JSON.stringify(savedSettings));
  }, [settings, savedSettings]);

  // Update local setting (no auto-save)
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

  // Compute preview styles for vertical alignment
  const verticalAlignStyle = {
    top: 'justify-start pt-8',
    center: 'justify-center',
    bottom: 'justify-end pb-8',
  }[settings.vertical_align] || 'justify-center';

  return (
    <div className="min-h-screen bg-verse-bg">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-verse-bg/95 backdrop-blur border-b border-verse-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href={`/${org.slug}`}
              className="p-2 text-verse-muted hover:text-verse-text transition-colors rounded-lg hover:bg-verse-surface"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-display text-xl font-bold text-verse-text">Display Settings</h1>
              <p className="text-sm text-verse-muted">{org.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasChanges && (
              <button
                onClick={revertChanges}
                className="px-4 py-2 text-sm text-verse-muted hover:text-verse-text transition-colors"
              >
                Discard Changes
              </button>
            )}
            <button
              onClick={resetToDefaults}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-verse-border text-verse-muted hover:text-verse-text rounded-xl transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Default
            </button>
            <button
              onClick={saveSettings}
              disabled={!hasChanges || saving}
              className={`flex items-center gap-2 px-4 py-2 font-semibold rounded-xl transition-colors ${
                hasChanges 
                  ? 'bg-gold-500 text-verse-bg hover:bg-gold-400' 
                  : 'bg-verse-border text-verse-muted cursor-not-allowed'
              }`}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Saving...' : hasChanges ? 'Save Changes' : 'Saved'}
            </button>
            <a
              href={`/display/${org.slug}`}
              target="_blank"
              className="flex items-center gap-2 px-4 py-2 bg-verse-surface border border-verse-border text-verse-text font-medium rounded-xl hover:bg-verse-elevated transition-colors"
            >
              <Monitor className="w-4 h-4" />
              Preview
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Settings Panel */}
          <div className="space-y-6">
            {/* Theme Presets */}
            <div className="bg-verse-surface border border-verse-border rounded-2xl p-6">
              <h2 className="font-semibold text-verse-text mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5 text-gold-500" />
                Theme Presets
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {Object.entries(THEME_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => applyPreset(key)}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      settings.theme_preset === key
                        ? 'border-gold-500 bg-gold-500/10'
                        : 'border-verse-border hover:border-verse-muted'
                    }`}
                  >
                    <div 
                      className="w-full h-8 rounded-lg mb-2"
                      style={{ backgroundColor: preset.background_color }}
                    >
                      <div className="flex items-center justify-center h-full">
                        <span style={{ color: preset.reference_color, fontSize: 10, fontWeight: 'bold' }}>Aa</span>
                      </div>
                    </div>
                    <span className="text-xs text-verse-text">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Reference */}
            <div className="bg-verse-surface border border-verse-border rounded-2xl p-6">
              <h2 className="font-semibold text-verse-text mb-4 flex items-center gap-2">
                <Type className="w-5 h-5 text-gold-500" />
                Reference (e.g. John 3:16)
              </h2>
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
                        className={`flex-1 py-2 px-4 rounded-xl border-2 transition-all ${
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
                  <label className="block text-sm text-verse-muted mb-2">Font Size: {settings.reference_font_size}px</label>
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
            </div>

            {/* Verse Text */}
            <div className="bg-verse-surface border border-verse-border rounded-2xl p-6">
              <h2 className="font-semibold text-verse-text mb-4">Verse Text</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-verse-muted mb-2">Font Size: {settings.verse_font_size}px</label>
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
                  <label className="block text-sm text-verse-muted mb-2">Font Family</label>
                  <select
                    value={settings.verse_font_family}
                    onChange={(e) => updateSetting('verse_font_family', e.target.value)}
                    className="w-full px-4 py-2 bg-verse-bg border border-verse-border rounded-xl text-verse-text"
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
              </div>
            </div>

            {/* Translation */}
            <div className="bg-verse-surface border border-verse-border rounded-2xl p-6">
              <h2 className="font-semibold text-verse-text mb-4">Translation Label</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-verse-muted">Show Translation</label>
                  <button
                    onClick={() => updateSetting('show_translation', !settings.show_translation)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.show_translation ? 'bg-gold-500' : 'bg-verse-border'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      settings.show_translation ? 'translate-x-6' : 'translate-x-0.5'
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
                          { value: 'corner', label: 'Bottom Corner' },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => updateSetting('translation_position', opt.value)}
                            className={`flex-1 py-2 px-4 rounded-xl border-2 transition-all text-sm ${
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
                      <label className="block text-sm text-verse-muted mb-2">Font Size: {settings.translation_font_size}px</label>
                      <input
                        type="range"
                        min="12"
                        max="48"
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
            </div>

            {/* Background */}
            <div className="bg-verse-surface border border-verse-border rounded-2xl p-6">
              <h2 className="font-semibold text-verse-text mb-4 flex items-center gap-2">
                <Image className="w-5 h-5 text-gold-500" />
                Background
              </h2>
              <div className="space-y-4">
                <ColorPicker
                  label="Color"
                  value={settings.background_color}
                  onChange={(val) => updateSetting('background_color', val)}
                />
              </div>
            </div>

            {/* Layout */}
            <div className="bg-verse-surface border border-verse-border rounded-2xl p-6">
              <h2 className="font-semibold text-verse-text mb-4 flex items-center gap-2">
                <Layout className="w-5 h-5 text-gold-500" />
                Layout
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-verse-muted mb-2">Horizontal Alignment</label>
                  <div className="flex gap-2">
                    {['left', 'center', 'right'].map((align) => (
                      <button
                        key={align}
                        onClick={() => updateSetting('text_align', align)}
                        className={`flex-1 py-2 px-4 rounded-xl border-2 transition-all capitalize ${
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
                  <label className="block text-sm text-verse-muted mb-2">Vertical Position</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'top', label: 'Top' },
                      { value: 'center', label: 'Center' },
                      { value: 'bottom', label: 'Bottom' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => updateSetting('vertical_align', opt.value)}
                        className={`flex-1 py-2 px-4 rounded-xl border-2 transition-all ${
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
                <div>
                  <label className="block text-sm text-verse-muted mb-2">Padding: {settings.padding}px</label>
                  <input
                    type="range"
                    min="16"
                    max="128"
                    value={settings.padding}
                    onChange={(e) => updateSetting('padding', parseInt(e.target.value))}
                    className="w-full accent-gold-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview */}
          <div className="lg:sticky lg:top-24 h-fit">
            <div className="bg-verse-surface border border-verse-border rounded-2xl p-6">
              <h2 className="font-semibold text-verse-text mb-4 flex items-center gap-2">
                <Monitor className="w-5 h-5 text-gold-500" />
                Live Preview
              </h2>
              <div 
                className={`relative aspect-video rounded-xl overflow-hidden flex flex-col ${verticalAlignStyle}`}
                style={{ 
                  backgroundColor: settings.background_color,
                  padding: settings.padding / 2,
                }}
              >
                <div 
                  className="flex flex-col w-full"
                  style={{ textAlign: settings.text_align as any }}
                >
                  {/* Reference - Top */}
                  {settings.reference_position === 'top' && (
                    <h2 
                      className="font-bold mb-2"
                      style={{ 
                        fontSize: settings.reference_font_size / 2,
                        color: settings.reference_color,
                      }}
                    >
                      John 3:16
                    </h2>
                  )}

                  {/* Verse Text */}
                  <p 
                    className={`${fontFamilyClass} leading-relaxed`}
                    style={{ 
                      fontSize: settings.verse_font_size / 2.5,
                      color: settings.verse_color,
                    }}
                  >
                    "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life."
                  </p>

                  {/* Reference - Bottom */}
                  {settings.reference_position === 'bottom' && (
                    <h2 
                      className="font-bold mt-2"
                      style={{ 
                        fontSize: settings.reference_font_size / 2,
                        color: settings.reference_color,
                      }}
                    >
                      John 3:16
                    </h2>
                  )}

                  {/* Translation - Below */}
                  {settings.show_translation && settings.translation_position === 'below' && (
                    <p 
                      className="mt-2 uppercase tracking-widest"
                      style={{ 
                        fontSize: settings.translation_font_size / 2,
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
                    className="absolute bottom-2 right-3 uppercase tracking-widest"
                    style={{ 
                      fontSize: settings.translation_font_size / 2,
                      color: settings.translation_color,
                    }}
                  >
                    KJV
                  </p>
                )}

                {/* Watermark */}
                {settings.show_watermark && (
                  <div 
                    className="absolute bottom-2 left-3 text-xs opacity-50"
                    style={{ color: settings.translation_color, fontSize: 8 }}
                  >
                    Powered by VerseCue
                  </div>
                )}
              </div>
              
              <p className="text-xs text-verse-muted mt-4 text-center">
                Display URL: <code className="text-gold-400">versecue.app/display/{org.slug}</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
