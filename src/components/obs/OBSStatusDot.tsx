"use client";

import { cn } from '@/lib/utils';
import { OBSConnectionStatus } from '@/types/obs';

interface OBSStatusDotProps {
  status: OBSConnectionStatus;
  className?: string;
  pulse?: boolean;
}

const statusColors: Record<OBSConnectionStatus, string> = {
  disconnected: 'bg-gray-500',
  connecting: 'bg-yellow-500',
  connected: 'bg-green-500',
  error: 'bg-red-500',
};

export function OBSStatusDot({ status, className, pulse = true }: OBSStatusDotProps) {
  const shouldPulse = pulse && (status === 'connecting' || status === 'connected');
  
  return (
    <span
      className={cn(
        'w-2 h-2 rounded-full',
        statusColors[status],
        shouldPulse && status === 'connected' && 'animate-pulse',
        shouldPulse && status === 'connecting' && 'animate-ping',
        className
      )}
    />
  );
}
