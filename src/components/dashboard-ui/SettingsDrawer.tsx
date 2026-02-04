"use client";

import { useEffect, useRef } from 'react';
import { X, Mic, Brain, Sparkles, Check, AlertCircle, Loader2, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  audioDevices: { deviceId: string; label: string }[];
  selectedDevice: string;
  onDeviceChange: (deviceId: string) => void;
  speechProvider: 'browser' | 'deepgram';
  onSpeechProviderChange: (provider: 'browser' | 'deepgram') => void;
  deepgramAvailable: boolean;
  aiDetectionEnabled: boolean;
  onAiDetectionChange: (enabled: boolean) => void;
  groqAvailable: boolean;
  autoApprove: boolean;
  onAutoApproveChange: (enabled: boolean) => void;
  apiStatus: {
    bible: 'connected' | 'error' | 'loading';
    deepgram: 'connected' | 'error' | 'loading';
    groq: 'connected' | 'error' | 'loading';
  };
  // OBS settings
  showOBSPanel?: boolean;
  onShowOBSPanelChange?: (show: boolean) => void;
}

export function SettingsDrawer({
  isOpen,
  onClose,
  audioDevices,
  selectedDevice,
  onDeviceChange,
  speechProvider,
  onSpeechProviderChange,
  deepgramAvailable,
  aiDetectionEnabled,
  onAiDetectionChange,
  groqAvailable,
  autoApprove,
  onAutoApproveChange,
  apiStatus,
  showOBSPanel = false,
  onShowOBSPanelChange,
}: SettingsDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const StatusIcon = ({ status }: { status: 'connected' | 'error' | 'loading' }) => {
    if (status === 'loading') return <Loader2 className="w-3.5 h-3.5 animate-spin text-verse-muted" />;
    if (status === 'connected') return <Check className="w-3.5 h-3.5 text-green-500" />;
    return <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />;
  };

  return (
    <>
      <div 
        className={cn(
          'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      />

      <div
        ref={drawerRef}
        className={cn(
          'fixed top-0 right-0 h-full w-full max-w-md bg-verse-bg border-l border-verse-border shadow-2xl z-50 transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-verse-border">
          <h2 className="text-lg font-semibold text-verse-text">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-verse-muted hover:text-verse-text hover:bg-verse-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100%-65px)] p-6 space-y-8">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Mic className="w-4 h-4 text-gold-500" />
              <h3 className="text-sm font-semibold text-verse-text uppercase tracking-wide">Audio Input</h3>
            </div>
            <select
              value={selectedDevice}
              onChange={(e) => onDeviceChange(e.target.value)}
              className="w-full px-4 py-3 bg-verse-surface border border-verse-border rounded-xl text-verse-text text-sm focus:outline-none focus:border-gold-500 transition-colors"
            >
              {audioDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-4 h-4 text-gold-500" />
              <h3 className="text-sm font-semibold text-verse-text uppercase tracking-wide">Speech Recognition</h3>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => onSpeechProviderChange('browser')}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all',
                  speechProvider === 'browser'
                    ? 'border-gold-500 bg-gold-500/10'
                    : 'border-verse-border hover:border-verse-muted'
                )}
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-verse-text">Standard</p>
                  <p className="text-xs text-verse-muted">Browser-based, works offline</p>
                </div>
                {speechProvider === 'browser' && <Check className="w-5 h-5 text-gold-500" />}
              </button>
              <button
                onClick={() => deepgramAvailable && onSpeechProviderChange('deepgram')}
                disabled={!deepgramAvailable}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all',
                  speechProvider === 'deepgram'
                    ? 'border-gold-500 bg-gold-500/10'
                    : deepgramAvailable
                    ? 'border-verse-border hover:border-verse-muted'
                    : 'border-verse-border opacity-50 cursor-not-allowed'
                )}
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-verse-text flex items-center gap-2">
                    Enhanced
                    <span className="px-1.5 py-0.5 bg-gold-500/20 text-gold-400 text-[10px] font-semibold rounded">PRO</span>
                  </p>
                  <p className="text-xs text-verse-muted">Cloud-powered, higher accuracy</p>
                </div>
                {speechProvider === 'deepgram' && <Check className="w-5 h-5 text-gold-500" />}
              </button>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-gold-500" />
              <h3 className="text-sm font-semibold text-verse-text uppercase tracking-wide">Scripture Detection</h3>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => onAiDetectionChange(false)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all',
                  !aiDetectionEnabled
                    ? 'border-gold-500 bg-gold-500/10'
                    : 'border-verse-border hover:border-verse-muted'
                )}
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-verse-text">Direct</p>
                  <p className="text-xs text-verse-muted">Pattern matching, instant results</p>
                </div>
                {!aiDetectionEnabled && <Check className="w-5 h-5 text-gold-500" />}
              </button>
              <button
                onClick={() => groqAvailable && onAiDetectionChange(true)}
                disabled={!groqAvailable}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all',
                  aiDetectionEnabled
                    ? 'border-gold-500 bg-gold-500/10'
                    : groqAvailable
                    ? 'border-verse-border hover:border-verse-muted'
                    : 'border-verse-border opacity-50 cursor-not-allowed'
                )}
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-verse-text flex items-center gap-2">
                    Intelligent
                    <span className="px-1.5 py-0.5 bg-gold-500/20 text-gold-400 text-[10px] font-semibold rounded">PRO</span>
                  </p>
                  <p className="text-xs text-verse-muted">Understands context, not just exact quotes</p>
                  <p className="text-[10px] text-verse-muted/70 mt-0.5">e.g. 'The prodigal son' → Luke 15:11-32</p>
                </div>
                {aiDetectionEnabled && <Check className="w-5 h-5 text-gold-500" />}
              </button>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-verse-text">Auto-approve high confidence</h3>
                <p className="text-xs text-verse-muted mt-0.5">Automatically approve 95%+ matches</p>
              </div>
              <button
                onClick={() => onAutoApproveChange(!autoApprove)}
                className={cn(
                  'relative w-11 h-6 rounded-full transition-colors',
                  autoApprove ? 'bg-gold-500' : 'bg-verse-border'
                )}
              >
                <div className={cn(
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                  autoApprove ? 'translate-x-5' : 'translate-x-0.5'
                )} />
              </button>
            </div>
          </section>

          {/* OBS Integration */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Monitor className="w-4 h-4 text-gold-500" />
              <h3 className="text-sm font-semibold text-verse-text uppercase tracking-wide">Integrations</h3>
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-verse-surface rounded-xl border border-verse-border">
              <div>
                <h3 className="text-sm font-medium text-verse-text">OBS Studio</h3>
                <p className="text-xs text-verse-muted mt-0.5">Control OBS scenes remotely</p>
              </div>
              <button
                onClick={() => onShowOBSPanelChange?.(!showOBSPanel)}
                className={cn(
                  'relative w-11 h-6 rounded-full transition-colors',
                  showOBSPanel ? 'bg-gold-500' : 'bg-verse-border'
                )}
              >
                <div className={cn(
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                  showOBSPanel ? 'translate-x-5' : 'translate-x-0.5'
                )} />
              </button>
            </div>
          </section>

          <section>
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <h3 className="text-sm font-semibold text-verse-muted uppercase tracking-wide">API Status</h3>
                <span className="text-xs text-verse-muted group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between px-4 py-2.5 bg-verse-surface rounded-lg">
                  <span className="text-sm text-verse-text">Scripture Database</span>
                  <StatusIcon status={apiStatus.bible} />
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 bg-verse-surface rounded-lg">
                  <span className="text-sm text-verse-text">Speech Recognition</span>
                  <StatusIcon status={apiStatus.deepgram} />
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 bg-verse-surface rounded-lg">
                  <span className="text-sm text-verse-text">AI Detection</span>
                  <StatusIcon status={apiStatus.groq} />
                </div>
              </div>
              <p className="mt-3 text-xs text-verse-muted">
                KJV works offline. Other translations require internet.
              </p>
            </details>
          </section>
        </div>
      </div>
    </>
  );
}
