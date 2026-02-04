"use client";

// ============================================
// OBS Integration Test Component
// Remove this file after testing
// ============================================

import { useOBSContext } from '@/contexts/OBSContext';

export function OBSTestStatus() {
  const { state, settings } = useOBSContext();
  
  return (
    <div className="p-4 bg-verse-bg rounded-lg border border-verse-border">
      <h3 className="text-sm font-bold text-verse-text mb-2">OBS Debug</h3>
      <div className="text-xs text-verse-muted space-y-1">
        <p>Enabled: {settings.enabled ? 'Yes' : 'No'}</p>
        <p>Status: {state.status}</p>
        <p>Scenes: {state.scenes.length}</p>
        <p>Current: {state.currentProgramScene || 'None'}</p>
        {state.error && <p className="text-red-400">Error: {state.error}</p>}
      </div>
    </div>
  );
}
