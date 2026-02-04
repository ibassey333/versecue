"use client";

// ============================================
// OBS Context - Global OBS State Provider
// ============================================

import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useOBS } from '@/hooks/useOBS';
import { useSessionStore } from '@/stores/session';
import { OBSState, OBSSettings, DEFAULT_OBS_STATE, DEFAULT_OBS_SETTINGS } from '@/types/obs';

interface OBSContextValue {
  // State
  state: OBSState;
  settings: OBSSettings;
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  switchScene: (sceneName: string) => Promise<void>;
  setPreviewScene: (sceneName: string) => Promise<void>;
  transitionToProgram: () => Promise<void>;
  setTransition: (name: string, duration?: number) => Promise<void>;
  fetchScreenshot: () => Promise<string | null>;
  refreshScenes: () => Promise<void>;
  testConnection: (host: string, port: number, password: string) => Promise<boolean>;
  
  // Settings actions
  updateSettings: (settings: Partial<OBSSettings>) => void;
  setEnabled: (enabled: boolean) => void;
}

const OBSContext = createContext<OBSContextValue | null>(null);

export function OBSProvider({ children }: { children: ReactNode }) {
  // Get OBS settings from session store
  const obsSettings = useSessionStore((s) => s.obsSettings) || DEFAULT_OBS_SETTINGS;
  const updateOBSSettings = useSessionStore((s) => s.updateOBSSettings);
  
  const {
    state,
    connect,
    disconnect,
    switchScene,
    setPreviewScene,
    transitionToProgram,
    setTransition,
    fetchScreenshot,
    refreshScenes,
    testConnection,
  } = useOBS({ settings: obsSettings });
  
  const updateSettings = (updates: Partial<OBSSettings>) => {
    updateOBSSettings({ ...obsSettings, ...updates });
  };
  
  const setEnabled = (enabled: boolean) => {
    updateOBSSettings({ ...obsSettings, enabled });
  };
  
  const value: OBSContextValue = {
    state,
    settings: obsSettings,
    connect,
    disconnect,
    switchScene,
    setPreviewScene,
    transitionToProgram,
    setTransition,
    fetchScreenshot,
    refreshScenes,
    testConnection,
    updateSettings,
    setEnabled,
  };
  
  return (
    <OBSContext.Provider value={value}>
      {children}
    </OBSContext.Provider>
  );
}

export function useOBSContext(): OBSContextValue {
  const context = useContext(OBSContext);
  if (!context) {
    throw new Error('useOBSContext must be used within an OBSProvider');
  }
  return context;
}

// Optional: Use without throwing (for conditional usage)
export function useOBSContextSafe(): OBSContextValue | null {
  return useContext(OBSContext);
}
