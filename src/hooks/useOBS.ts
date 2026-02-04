"use client";

// ============================================
// useOBS Hook - OBS WebSocket Connection
// ============================================

import { useEffect, useRef, useCallback, useState } from 'react';
import OBSWebSocket from 'obs-websocket-js';
import { OBSState, OBSSettings, OBSScene, DEFAULT_OBS_STATE } from '@/types/obs';

interface UseOBSOptions {
  settings: OBSSettings;
  onStateChange?: (state: OBSState) => void;
}

interface UseOBSReturn {
  state: OBSState;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchScene: (sceneName: string) => Promise<void>;
  setPreviewScene: (sceneName: string) => Promise<void>;
  transitionToProgram: () => Promise<void>;
  setTransition: (name: string, duration?: number) => Promise<void>;
  fetchScreenshot: () => Promise<string | null>;
  refreshScenes: () => Promise<void>;
  testConnection: (host: string, port: number, password: string) => Promise<boolean>;
}

export function useOBS({ settings, onStateChange }: UseOBSOptions): UseOBSReturn {
  const obsRef = useRef<OBSWebSocket | null>(null);
  const [state, setState] = useState<OBSState>(DEFAULT_OBS_STATE);
  const screenshotIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update state helper
  const updateState = useCallback((updates: Partial<OBSState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      onStateChange?.(newState);
      return newState;
    });
  }, [onStateChange]);

  // Connect to OBS
  const connect = useCallback(async () => {
    if (!settings.enabled) return;
    if (obsRef.current) {
      try { obsRef.current.disconnect(); } catch {}
    }

    updateState({ status: 'connecting', error: null });

    try {
      const obs = new OBSWebSocket();
      obsRef.current = obs;

      const url = `ws://${settings.host}:${settings.port}`;
      await obs.connect(url, settings.password || undefined);

      // Get initial data
      const [sceneList, currentScene, transitionList] = await Promise.all([
        obs.call('GetSceneList'),
        obs.call('GetCurrentProgramScene'),
        obs.call('GetSceneTransitionList'),
      ]);

      const scenes: OBSScene[] = (sceneList.scenes as any[]).map((s, i) => ({
        sceneName: s.sceneName,
        sceneIndex: i,
      }));

      updateState({
        status: 'connected',
        error: null,
        scenes,
        currentProgramScene: currentScene.currentProgramSceneName,
        transitions: (transitionList.transitions as any[]).map(t => ({
          transitionName: t.transitionName,
          transitionKind: t.transitionKind,
        })),
        currentTransition: transitionList.currentSceneTransitionName,
        transitionDuration: 300,
      });

      // Set up event listeners
      obs.on('CurrentProgramSceneChanged', (data) => {
        updateState({ currentProgramScene: data.sceneName });
      });

      obs.on('CurrentPreviewSceneChanged', (data) => {
        updateState({ currentPreviewScene: data.sceneName });
      });

      obs.on('SceneListChanged', async () => {
        const newList = await obs.call('GetSceneList');
        const newScenes: OBSScene[] = (newList.scenes as any[]).map((s, i) => ({
          sceneName: s.sceneName,
          sceneIndex: i,
        }));
        updateState({ scenes: newScenes });
      });

      obs.on('ConnectionClosed', () => {
        updateState({ 
          status: 'disconnected', 
          programScreenshot: null,
          previewScreenshot: null,
        });
        // Auto-reconnect after 5 seconds
        if (settings.enabled) {
          reconnectTimeoutRef.current = setTimeout(() => connect(), 5000);
        }
      });

      obs.on('ConnectionError', (err) => {
        updateState({ 
          status: 'error', 
          error: err.message || 'Connection error',
        });
      });

      // Start screenshot interval if enabled
      if (settings.screenshotInterval > 0) {
        screenshotIntervalRef.current = setInterval(async () => {
          try {
            const screenshot = await obs.call('GetSourceScreenshot', {
              sourceName: currentScene.currentProgramSceneName,
              imageFormat: 'jpg',
              imageWidth: 320,
              imageHeight: 180,
              imageCompressionQuality: 50,
            });
            updateState({ programScreenshot: screenshot.imageData });
          } catch {
            // Ignore screenshot errors
          }
        }, settings.screenshotInterval);
      }

    } catch (err: any) {
      console.error('[OBS] Connection error:', err);
      updateState({
        status: 'error',
        error: err.message || 'Failed to connect to OBS',
      });
    }
  }, [settings, updateState]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (screenshotIntervalRef.current) {
      clearInterval(screenshotIntervalRef.current);
      screenshotIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (obsRef.current) {
      try { obsRef.current.disconnect(); } catch {}
      obsRef.current = null;
    }
    updateState(DEFAULT_OBS_STATE);
  }, [updateState]);

  // Switch scene (Simple mode - immediate)
  const switchScene = useCallback(async (sceneName: string) => {
    if (!obsRef.current || state.status !== 'connected') return;
    
    try {
      await obsRef.current.call('SetCurrentProgramScene', { sceneName });
    } catch (err: any) {
      console.error('[OBS] Failed to switch scene:', err);
      updateState({ error: err.message });
    }
  }, [state.status, updateState]);

  // Set preview scene (Studio mode)
  const setPreviewScene = useCallback(async (sceneName: string) => {
    if (!obsRef.current || state.status !== 'connected') return;
    
    try {
      await obsRef.current.call('SetCurrentPreviewScene', { sceneName });
      updateState({ currentPreviewScene: sceneName });
      
      // Fetch preview screenshot
      if (settings.screenshotInterval > 0) {
        const screenshot = await obsRef.current.call('GetSourceScreenshot', {
          sourceName: sceneName,
          imageFormat: 'jpg',
          imageWidth: 320,
          imageHeight: 180,
          imageCompressionQuality: 50,
        });
        updateState({ previewScreenshot: screenshot.imageData });
      }
    } catch (err: any) {
      console.error('[OBS] Failed to set preview:', err);
    }
  }, [state.status, settings.screenshotInterval, updateState]);

  // Transition preview to program (Studio mode)
  const transitionToProgram = useCallback(async () => {
    if (!obsRef.current || state.status !== 'connected') return;
    
    try {
      await obsRef.current.call('TriggerStudioModeTransition');
    } catch (err: any) {
      console.error('[OBS] Failed to transition:', err);
    }
  }, [state.status]);

  // Set transition type and duration
  const setTransition = useCallback(async (name: string, duration?: number) => {
    if (!obsRef.current || state.status !== 'connected') return;
    
    try {
      await obsRef.current.call('SetCurrentSceneTransition', { 
        transitionName: name 
      });
      if (duration !== undefined) {
        await obsRef.current.call('SetCurrentSceneTransitionDuration', {
          transitionDuration: duration,
        });
      }
      updateState({ 
        currentTransition: name,
        transitionDuration: duration ?? state.transitionDuration,
      });
    } catch (err: any) {
      console.error('[OBS] Failed to set transition:', err);
    }
  }, [state.status, state.transitionDuration, updateState]);

  // Fetch screenshot on demand
  const fetchScreenshot = useCallback(async (): Promise<string | null> => {
    if (!obsRef.current || state.status !== 'connected' || !state.currentProgramScene) {
      return null;
    }
    
    try {
      const screenshot = await obsRef.current.call('GetSourceScreenshot', {
        sourceName: state.currentProgramScene,
        imageFormat: 'jpg',
        imageWidth: 320,
        imageHeight: 180,
        imageCompressionQuality: 50,
      });
      updateState({ programScreenshot: screenshot.imageData });
      return screenshot.imageData;
    } catch {
      return null;
    }
  }, [state.status, state.currentProgramScene, updateState]);

  // Refresh scenes list
  const refreshScenes = useCallback(async () => {
    if (!obsRef.current || state.status !== 'connected') return;
    
    try {
      const sceneList = await obsRef.current.call('GetSceneList');
      const scenes: OBSScene[] = (sceneList.scenes as any[]).map((s, i) => ({
        sceneName: s.sceneName,
        sceneIndex: i,
      }));
      updateState({ scenes });
    } catch (err: any) {
      console.error('[OBS] Failed to refresh scenes:', err);
    }
  }, [state.status, updateState]);

  // Test connection (for settings UI)
  const testConnection = useCallback(async (
    host: string, 
    port: number, 
    password: string
  ): Promise<boolean> => {
    const testObs = new OBSWebSocket();
    try {
      await testObs.connect(`ws://${host}:${port}`, password || undefined);
      testObs.disconnect();
      return true;
    } catch {
      return false;
    }
  }, []);

  // Auto-connect when enabled
  useEffect(() => {
    if (settings.enabled && state.status === 'disconnected') {
      connect();
    } else if (!settings.enabled && state.status !== 'disconnected') {
      disconnect();
    }
    
    return () => {
      if (screenshotIntervalRef.current) {
        clearInterval(screenshotIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [settings.enabled]);

  return {
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
  };
}
