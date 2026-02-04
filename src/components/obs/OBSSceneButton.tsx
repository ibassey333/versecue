"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OBSSceneButtonProps {
  name: string;
  isLive?: boolean;
  isPreview?: boolean;
  compact?: boolean;
  onClick: () => void;
}

export function OBSSceneButton({
  name,
  isLive = false,
  isPreview = false,
  compact = false,
  onClick,
}: OBSSceneButtonProps) {
  const [switching, setSwitching] = useState(false);

  const handleClick = async () => {
    if (switching || isLive) return;
    setSwitching(true);
    onClick();
    // Brief feedback delay
    setTimeout(() => setSwitching(false), 400);
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={switching || isLive}
      whileHover={{ scale: isLive ? 1 : 1.02 }}
      whileTap={{ scale: isLive ? 1 : 0.98 }}
      className={cn(
        'relative flex items-center gap-2 rounded-lg border transition-all overflow-hidden',
        compact ? 'px-2 py-1.5' : 'px-3 py-2',
        isLive
          ? 'border-red-500 bg-red-500/10 ring-1 ring-red-500/30 cursor-default'
          : isPreview
            ? 'border-yellow-500 bg-yellow-500/10 ring-1 ring-yellow-500/30'
            : 'border-verse-border bg-verse-bg hover:bg-verse-elevated hover:border-gold-500/50',
        switching && 'opacity-70'
      )}
    >
      {/* Status indicator */}
      <span
        className={cn(
          'w-2 h-2 rounded-full flex-shrink-0',
          isLive ? 'bg-red-500 animate-pulse' : isPreview ? 'bg-yellow-500' : 'bg-verse-border'
        )}
      />

      {/* Scene name */}
      <span
        className={cn(
          'truncate text-xs font-medium',
          isLive ? 'text-red-400' : isPreview ? 'text-yellow-400' : 'text-verse-text'
        )}
      >
        {name}
      </span>

      {/* Switching loader */}
      {switching && (
        <Loader2 className="w-3 h-3 animate-spin text-gold-500 absolute right-2" />
      )}

      {/* Live badge */}
      {isLive && (
        <span className="absolute top-0.5 right-0.5 px-1 py-0.5 text-[8px] font-bold text-white bg-red-500 rounded uppercase">
          Live
        </span>
      )}
    </motion.button>
  );
}
