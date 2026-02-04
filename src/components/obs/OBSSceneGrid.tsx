"use client";

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OBSScene } from '@/types/obs';
import { OBSSceneButton } from './OBSSceneButton';

interface OBSSceneGridProps {
  scenes: OBSScene[];
  currentScene: string | null;
  previewScene?: string | null;
  compact?: boolean;
  onSceneSelect: (sceneName: string) => void;
  maxVisible?: number;
}

export function OBSSceneGrid({
  scenes,
  currentScene,
  previewScene,
  compact = false,
  onSceneSelect,
  maxVisible = 6,
}: OBSSceneGridProps) {
  const [showAll, setShowAll] = useState(false);

  // Reverse scenes (OBS returns bottom-to-top)
  const orderedScenes = [...scenes].reverse();
  const visibleScenes = showAll ? orderedScenes : orderedScenes.slice(0, maxVisible);
  const hasMore = orderedScenes.length > maxVisible;

  if (scenes.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-verse-muted">No scenes available</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className={cn('grid gap-1.5', compact ? 'grid-cols-2' : 'grid-cols-2')}>
        {visibleScenes.map((scene) => (
          <OBSSceneButton
            key={scene.sceneName}
            name={scene.sceneName}
            isLive={scene.sceneName === currentScene}
            isPreview={scene.sceneName === previewScene}
            compact={compact}
            onClick={() => onSceneSelect(scene.sceneName)}
          />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-verse-muted hover:text-verse-text transition-colors rounded-lg hover:bg-verse-elevated"
        >
          {showAll ? (
            <>
              <ChevronUp className="w-3 h-3" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              +{orderedScenes.length - maxVisible} more
            </>
          )}
        </button>
      )}
    </div>
  );
}
