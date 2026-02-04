"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  X,
  Monitor,
  Wifi,
  WifiOff,
  Settings,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOBSContext } from '@/contexts/OBSContext';
import { OBSStatusDot } from './OBSStatusDot';
import { OBSSceneGrid } from './OBSSceneGrid';
import { OBSLiveOutput } from './OBSLiveOutput';
import { OBSStudioMode } from './OBSStudioMode';

interface OBSRemotePanelProps {
  className?: string;
  defaultExpanded?: boolean;
}

export function OBSRemotePanel({ className, defaultExpanded = true }: OBSRemotePanelProps) {
  const {
    state,
    settings,
    connect,
    disconnect,
    switchScene,
    setPreviewScene,
    transitionToProgram,
    setTransition,
    fetchScreenshot,
    updateSettings,
    testConnection,
  } = useOBSContext();

  const [expanded, setExpanded] = useState(defaultExpanded);
  const [showSetup, setShowSetup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null);

  // Local form state for setup
  const [formHost, setFormHost] = useState(settings.host);
  const [formPort, setFormPort] = useState(settings.port);
  const [formPassword, setFormPassword] = useState(settings.password);

  // Sync form with settings
  useEffect(() => {
    setFormHost(settings.host);
    setFormPort(settings.port);
    setFormPassword(settings.password);
  }, [settings]);

  // Handle test connection
  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const success = await testConnection(formHost, formPort, formPassword);
    setTestResult(success ? 'success' : 'fail');
    setTesting(false);
  };

  // Handle save and connect
  const handleSaveAndConnect = () => {
    updateSettings({
      host: formHost,
      port: formPort,
      password: formPassword,
      enabled: true,
    });
    setShowSetup(false);
  };

  // Handle scene selection
  const handleSceneSelect = (sceneName: string) => {
    if (settings.mode === 'studio') {
      setPreviewScene(sceneName);
    } else {
      switchScene(sceneName);
    }
  };

  // ==========================================
  // DISABLED STATE - Show setup prompt
  // ==========================================
  if (!settings.enabled) {
    return (
      <div className={cn('rounded-xl border border-verse-border bg-verse-surface overflow-hidden', className)}>
        <button
          onClick={() => setShowSetup(true)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-verse-elevated/50 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-verse-border flex items-center justify-center">
            <Monitor className="w-4 h-4 text-verse-muted" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-verse-muted">OBS Remote</p>
            <p className="text-xs text-verse-subtle">Tap to set up</p>
          </div>
          <OBSStatusDot status="disconnected" pulse={false} />
        </button>

        {/* Setup Modal */}
        <AnimatePresence>
          {showSetup && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-verse-border"
            >
              <div className="p-4 space-y-4">
                <h4 className="text-sm font-semibold text-verse-text">Connect to OBS</h4>

                {/* Host & Port */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-xs text-verse-muted mb-1 block">Host</label>
                    <input
                      type="text"
                      value={formHost}
                      onChange={(e) => setFormHost(e.target.value)}
                      placeholder="localhost"
                      className="w-full px-3 py-2 bg-verse-bg border border-verse-border rounded-lg text-sm text-verse-text placeholder-verse-muted focus:outline-none focus:border-gold-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-verse-muted mb-1 block">Port</label>
                    <input
                      type="number"
                      value={formPort}
                      onChange={(e) => setFormPort(parseInt(e.target.value) || 4455)}
                      placeholder="4455"
                      className="w-full px-3 py-2 bg-verse-bg border border-verse-border rounded-lg text-sm text-verse-text placeholder-verse-muted focus:outline-none focus:border-gold-500"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="text-xs text-verse-muted mb-1 block">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Optional"
                      className="w-full px-3 py-2 pr-10 bg-verse-bg border border-verse-border rounded-lg text-sm text-verse-text placeholder-verse-muted focus:outline-none focus:border-gold-500"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-verse-muted hover:text-verse-text"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Test Result */}
                {testResult && (
                  <div
                    className={cn(
                      'p-2 rounded-lg text-xs',
                      testResult === 'success'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                        : 'bg-red-500/10 text-red-400 border border-red-500/30'
                    )}
                  >
                    {testResult === 'success' ? '✓ Connection successful!' : '✗ Could not connect to OBS'}
                  </div>
                )}

                {/* Instructions */}
                <div className="p-3 bg-verse-bg rounded-lg">
                  <p className="text-xs text-verse-muted leading-relaxed">
                    <strong className="text-verse-text">Setup:</strong> In OBS, go to{' '}
                    <span className="text-verse-text">Tools → WebSocket Server Settings</span>, enable the server,
                    and copy the password here.
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleTest}
                    disabled={testing}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-verse-bg border border-verse-border rounded-lg text-sm text-verse-text hover:bg-verse-elevated transition-colors"
                  >
                    {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                    Test
                  </button>
                  <button
                    onClick={handleSaveAndConnect}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-gold-500 rounded-lg text-sm text-verse-bg font-semibold hover:bg-gold-400 transition-colors"
                  >
                    Connect
                  </button>
                </div>

                {/* Cancel */}
                <button
                  onClick={() => setShowSetup(false)}
                  className="w-full text-xs text-verse-muted hover:text-verse-text transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ==========================================
  // ENABLED STATE - Full panel
  // ==========================================
  return (
    <div className={cn('rounded-xl border border-verse-border bg-verse-surface overflow-hidden', className)}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-verse-elevated/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-verse-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-verse-muted" />
          )}
          <span className="text-sm font-semibold text-verse-text uppercase tracking-wide">OBS Remote</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Toggle */}
          {expanded && state.status === 'connected' && (
            <select
              value={settings.mode}
              onChange={(e) => {
                e.stopPropagation();
                updateSettings({ mode: e.target.value as 'simple' | 'studio' });
              }}
              onClick={(e) => e.stopPropagation()}
              className="px-2 py-1 text-xs bg-verse-bg border border-verse-border rounded-lg text-verse-muted cursor-pointer"
            >
              <option value="simple">Simple</option>
              <option value="studio">Studio</option>
            </select>
          )}

          {/* Compact Toggle */}
          {expanded && state.status === 'connected' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateSettings({ compactView: !settings.compactView });
              }}
              className="p-1 text-verse-muted hover:text-verse-text transition-colors"
              title={settings.compactView ? 'Show preview' : 'Compact view'}
            >
              {settings.compactView ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Status Dot */}
          <OBSStatusDot status={state.status} />

          {/* Disconnect */}
          {state.status === 'connected' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                disconnect();
                updateSettings({ enabled: false });
              }}
              className="p-1 text-verse-muted hover:text-red-400 transition-colors"
              title="Disconnect"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Error State */}
              {state.status === 'error' && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-xs text-red-400">{state.error || 'Connection failed'}</p>
                  <button
                    onClick={() => connect()}
                    className="mt-2 text-xs text-red-400 underline hover:text-red-300"
                  >
                    Retry connection
                  </button>
                </div>
              )}

              {/* Connecting State */}
              {state.status === 'connecting' && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-gold-500" />
                  <span className="text-xs text-verse-muted">Connecting to OBS...</span>
                </div>
              )}

              {/* Connected State */}
              {state.status === 'connected' && (
                <>
                  {/* Live Output / Studio Mode */}
                  {!settings.compactView &&
                    (settings.mode === 'studio' ? (
                      <OBSStudioMode
                        programScreenshot={state.programScreenshot}
                        previewScreenshot={state.previewScreenshot}
                        programScene={state.currentProgramScene}
                        previewScene={state.currentPreviewScene}
                        transitionName={state.currentTransition}
                        transitionDuration={state.transitionDuration}
                        onTransition={transitionToProgram}
                        onRefresh={fetchScreenshot}
                      />
                    ) : (
                      <OBSLiveOutput
                        screenshot={state.programScreenshot}
                        sceneName={state.currentProgramScene}
                        onRefresh={fetchScreenshot}
                      />
                    ))}

                  {/* Compact: Current scene only */}
                  {settings.compactView && (
                    <div className="flex items-center gap-2 p-2 bg-verse-bg rounded-lg">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-sm font-medium text-verse-text truncate">
                        {state.currentProgramScene || 'No scene'}
                      </span>
                    </div>
                  )}

                  {/* Scene Grid */}
                  <OBSSceneGrid
                    scenes={state.scenes}
                    currentScene={state.currentProgramScene}
                    previewScene={settings.mode === 'studio' ? state.currentPreviewScene : undefined}
                    compact={settings.compactView}
                    onSceneSelect={handleSceneSelect}
                  />

                  {/* Transition Selector */}
                  {state.transitions.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-verse-muted">Transition:</span>
                      <select
                        value={state.currentTransition || ''}
                        onChange={(e) => setTransition(e.target.value)}
                        className="flex-1 px-2 py-1.5 text-xs bg-verse-bg border border-verse-border rounded-lg text-verse-text"
                      >
                        {state.transitions.map((t) => (
                          <option key={t.transitionName} value={t.transitionName}>
                            {t.transitionName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
