// ============================================
// Approved Queue Component
// Shows scriptures ready to display
// ============================================

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Clock } from 'lucide-react';
import { cn, formatTime, truncate } from '@/lib/utils';
import { useApprovedQueue, useSessionStore } from '@/stores/session';
import { QueueItem } from '@/types';

interface ApprovedQueueProps {
  className?: string;
}

function ApprovedCard({ item, onDisplay }: {
  item: QueueItem;
  onDisplay: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={cn(
        'group flex items-center gap-4 p-4 rounded-xl',
        'bg-verse-elevated border border-confidence-high/30',
        'hover:border-confidence-high/60 transition-all duration-200'
      )}
    >
      {/* Reference info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-display text-lg font-semibold text-confidence-high truncate">
          {item.reference.reference}
        </h4>
        {item.verseText && (
          <p className="text-xs text-verse-subtle mt-1 line-clamp-1">
            {truncate(item.verseText, 60)}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2 text-[10px] text-verse-muted">
          <Clock className="w-3 h-3" />
          <span>Approved {formatTime(item.approvedAt || new Date())}</span>
        </div>
      </div>
      
      {/* Display button */}
      <button
        onClick={onDisplay}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-lg',
          'bg-gold-500 text-verse-bg font-semibold text-sm',
          'hover:bg-gold-400 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:ring-offset-2 focus:ring-offset-verse-elevated',
          'shadow-lg shadow-gold-500/20'
        )}
      >
        <Monitor className="w-4 h-4" />
        <span>Display</span>
        <kbd className="ml-1 text-[10px] opacity-60 font-mono">↵</kbd>
      </button>
    </motion.div>
  );
}

export function ApprovedQueue({ className }: ApprovedQueueProps) {
  const approvedQueue = useApprovedQueue();
  const { displayScripture } = useSessionStore();
  
  return (
    <div className={cn(
      'flex flex-col rounded-xl border border-verse-border bg-verse-surface',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-verse-border">
        <div className="flex items-center gap-3">
          <h3 className="font-body text-sm font-semibold text-verse-text tracking-wide uppercase">
            Ready to Display
          </h3>
          {approvedQueue.length > 0 && (
            <span className="flex items-center justify-center min-w-[24px] h-6 px-2 text-xs font-bold text-verse-bg bg-confidence-high rounded-full">
              {approvedQueue.length}
            </span>
          )}
        </div>
      </div>
      
      {/* Queue content */}
      <div className="flex-1 overflow-y-auto p-4 min-h-[150px] max-h-[300px]">
        {approvedQueue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="text-3xl mb-3 opacity-50">📋</div>
            <p className="text-verse-subtle text-sm">
              Approved scriptures appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {approvedQueue.map((item) => (
                <ApprovedCard
                  key={item.id}
                  item={item}
                  onDisplay={() => displayScripture(item.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
