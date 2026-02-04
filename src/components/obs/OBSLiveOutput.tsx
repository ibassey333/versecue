"use client";

import { RefreshCw, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OBSLiveOutputProps {
  screenshot: string | null;
  sceneName: string | null;
  label?: string;
  isLive?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export function OBSLiveOutput({
  screenshot,
  sceneName,
  label = 'PROGRAM',
  isLive = true,
  onRefresh,
  className,
}: OBSLiveOutputProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-verse-subtle uppercase tracking-wider font-medium">
            {label}
          </span>
          {isLive && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[8px] font-bold rounded uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Live
            </span>
          )}
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-1 text-verse-muted hover:text-verse-text transition-colors rounded hover:bg-verse-elevated"
            title="Refresh"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Preview */}
      <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-verse-border">
        {screenshot ? (
          <img
            src={screenshot}
            alt={`OBS ${label}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <Monitor className="w-6 h-6 text-white/30" />
            <span className="text-[10px] text-white/50">No preview</span>
          </div>
        )}

        {/* Scene name overlay */}
        {sceneName && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-4">
            <span className="text-xs text-white font-medium truncate block">
              {sceneName}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
