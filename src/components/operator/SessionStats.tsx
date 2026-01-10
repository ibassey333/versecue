// ============================================
// Session Stats Component
// Shows current session statistics
// ============================================

'use client';

import { motion } from 'framer-motion';
import { BookOpen, Check, Monitor, X, Clock } from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';
import { useStats, useSessionStore } from '@/stores/session';

interface SessionStatsProps {
  className?: string;
}

export function SessionStats({ className }: SessionStatsProps) {
  const stats = useStats();
  const { startedAt } = useSessionStore();
  
  const statItems = [
    {
      icon: BookOpen,
      label: 'Detected',
      value: stats.detected,
      color: 'text-gold-500',
      bgColor: 'bg-gold-500/10',
    },
    {
      icon: Check,
      label: 'Approved',
      value: stats.approved,
      color: 'text-confidence-high',
      bgColor: 'bg-confidence-high/10',
    },
    {
      icon: Monitor,
      label: 'Displayed',
      value: stats.displayed,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
    },
    {
      icon: X,
      label: 'Dismissed',
      value: stats.dismissed,
      color: 'text-verse-muted',
      bgColor: 'bg-verse-muted/10',
    },
  ];
  
  return (
    <div className={cn(
      'rounded-xl border border-verse-border bg-verse-surface p-5',
      className
    )}>
      {/* Header with session duration */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-body text-sm font-semibold text-verse-text tracking-wide uppercase">
          Session Stats
        </h3>
        {startedAt && (
          <div className="flex items-center gap-2 text-xs text-verse-subtle">
            <Clock className="w-3 h-3" />
            <span>{formatDuration(startedAt, new Date())}</span>
          </div>
        )}
      </div>
      
      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-3">
        {statItems.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              'flex flex-col items-center justify-center p-3 rounded-xl',
              item.bgColor
            )}
          >
            <item.icon className={cn('w-4 h-4 mb-1', item.color)} />
            <span className={cn('text-2xl font-bold font-display', item.color)}>
              {item.value}
            </span>
            <span className="text-[10px] text-verse-muted uppercase tracking-wide">
              {item.label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
