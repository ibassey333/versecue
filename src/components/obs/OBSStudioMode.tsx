"use client";

import { motion } from 'framer-motion';
import { Play, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OBSLiveOutput } from './OBSLiveOutput';

interface OBSStudioModeProps {
  programScreenshot: string | null;
  previewScreenshot: string | null;
  programScene: string | null;
  previewScene: string | null;
  transitionName: string | null;
  transitionDuration: number;
  onTransition: () => void;
  onRefresh?: () => void;
  className?: string;
}

export function OBSStudioMode({
  programScreenshot,
  previewScreenshot,
  programScene,
  previewScene,
  transitionName,
  transitionDuration,
  onTransition,
  onRefresh,
  className,
}: OBSStudioModeProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Program (Live) */}
      <OBSLiveOutput
        screenshot={programScreenshot}
        sceneName={programScene}
        label="PROGRAM"
        isLive={true}
        onRefresh={onRefresh}
      />

      {/* Preview */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-verse-subtle uppercase tracking-wider font-medium">
            PREVIEW
          </span>
          {previewScene && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-[8px] font-bold rounded uppercase">
              Ready
            </span>
          )}
        </div>

        <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-yellow-500/30">
          {previewScreenshot ? (
            <img
              src={previewScreenshot}
              alt="OBS Preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] text-white/50">
                {previewScene ? 'Loading...' : 'Select a scene'}
              </span>
            </div>
          )}

          {previewScene && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-4">
              <span className="text-xs text-white font-medium truncate block">
                {previewScene}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Transition Button */}
      <motion.button
        onClick={onTransition}
        disabled={!previewScene}
        whileHover={{ scale: previewScene ? 1.02 : 1 }}
        whileTap={{ scale: previewScene ? 0.98 : 1 }}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-all',
          previewScene
            ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40'
            : 'bg-verse-border text-verse-muted cursor-not-allowed'
        )}
      >
        <Play className="w-4 h-4" />
        TRANSITION
        {transitionName && (
          <span className="text-xs opacity-70 flex items-center gap-1">
            <ArrowRight className="w-3 h-3" />
            {transitionName}
          </span>
        )}
      </motion.button>
    </div>
  );
}
