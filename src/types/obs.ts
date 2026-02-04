// ============================================
// OBS Integration Types
// ============================================
export type OBSConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface OBSScene {
  sceneName: string;
  sceneIndex: number;
  thumbnail?: string; // Base64 cached thumbnail
}

export interface OBSTransition {
  transitionName: string;
  transitionKind: string;
}

export interface OBSSettings {
  showPanel: boolean; // Whether to show OBS panel in UI at all
  enabled: boolean; // Whether OBS connection is active
  host: string;
  port: number;
  password: string;
  mode: 'simple' | 'studio';
  compactView: boolean;
  screenshotInterval: number; // ms, 0 = disabled
}

export interface OBSState {
  // Connection
  status: OBSConnectionStatus;
  error: string | null;
  
  // Scenes
  scenes: OBSScene[];
  currentProgramScene: string | null;
  currentPreviewScene: string | null; // Studio mode only
  
  // Screenshots
  programScreenshot: string | null; // Base64
  previewScreenshot: string | null; // Base64, studio mode only
  
  // Transitions
  transitions: OBSTransition[];
  currentTransition: string | null;
  transitionDuration: number;
}

export const DEFAULT_OBS_SETTINGS: OBSSettings = {
  showPanel: false, // Hidden by default - users enable in settings
  enabled: false,
  host: 'localhost',
  port: 4455,
  password: '',
  mode: 'simple',
  compactView: false,
  screenshotInterval: 2000, // 2 seconds
};

export const DEFAULT_OBS_STATE: OBSState = {
  status: 'disconnected',
  error: null,
  scenes: [],
  currentProgramScene: null,
  currentPreviewScene: null,
  programScreenshot: null,
  previewScreenshot: null,
  transitions: [],
  currentTransition: null,
  transitionDuration: 300,
};
