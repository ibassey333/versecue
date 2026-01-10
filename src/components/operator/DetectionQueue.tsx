// ============================================
// Detection Queue Component
// Shows pending scripture detections for approval
// ============================================

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePendingQueue, useSessionStore } from '@/stores/session';
import { QueueItem } from '@/types';

interface DetectionQueueProps {
  className?: string;
}

function ConfidenceBadge({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  const styles = {
    high: 'bg-confidence-high/20 text-confidence-high border-confidence-high/30',
    medium: 'bg-confidence-medium/20 text-confidence-medium border-confidence-medium/30',
    low: 'bg-confidence-low/20 text-confidence-low border-confidence-low/30',
  };
  
  const labels = {
    high: 'High',
    medium: 'Review',
    low: 'Low',
  };
  
  return (
    <span className={cn(
      'text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border',
      styles[confidence]
    )}>
      {labels[confidence]}
    </span>
  );
}

function DetectionCard({ item, onApprove, onDismiss }: {
  item: QueueItem;
  onApprove: () => void;
  onDismiss: () => void;
}) {
  const isLLM = item.detectionType === 'llm';
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={cn(
        'group relative rounded-xl border bg-verse-elevated p-4',
        'border-l-4 transition-all duration-200',
        item.confidence === 'high' && 'border-l-confidence-high border-verse-border hover:border-confidence-high/50',
        item.confidence === 'medium' && 'border-l-confidence-medium border-verse-border hover:border-confidence-medium/50',
        item.confidence === 'low' && 'border-l-confidence-low border-verse-border hover:border-confidence-low/50',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-display text-lg font-semibold text-gold-400 truncate">
              {item.reference.reference}
            </h4>
            <ConfidenceBadge confidence={item.confidence} />
          </div>
          
          <div className="flex items-center gap-2 text-xs text-verse-subtle">
            {isLLM && (
              <span className="flex items-center gap-1 text-gold-500">
                <Sparkles className="w-3 h-3" />
                AI detected
              </span>
            )}
            <span>Matched: "{item.matchedText.slice(0, 40)}..."</span>
          </div>
        </div>
      </div>
      
      {/* Verse preview */}
      {item.verseText && (
        <p className="text-sm text-verse-text/80 font-scripture italic mb-3 line-clamp-2">
          "{item.verseText}"
        </p>
      )}
      
      {/* LLM reasoning */}
      {item.reasoning && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-verse-bg/50 mb-3">
          <AlertCircle className="w-4 h-4 text-gold-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-verse-subtle">{item.reasoning}</p>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onApprove}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg',
            'bg-confidence-high text-white font-medium text-sm',
            'hover:bg-confidence-high/90 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-confidence-high/50 focus:ring-offset-2 focus:ring-offset-verse-elevated'
          )}
        >
          <Check className="w-4 h-4" />
          <span>Approve</span>
          <kbd className="ml-1 text-[10px] opacity-60 font-mono">↵</kbd>
        </button>
        
        <button
          onClick={onDismiss}
          className={cn(
            'flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg',
            'bg-verse-border/50 text-verse-subtle font-medium text-sm',
            'hover:bg-verse-border hover:text-verse-text transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-verse-border focus:ring-offset-2 focus:ring-offset-verse-elevated'
          )}
        >
          <X className="w-4 h-4" />
          <kbd className="text-[10px] opacity-60 font-mono">esc</kbd>
        </button>
      </div>
    </motion.div>
  );
}

export function DetectionQueue({ className }: DetectionQueueProps) {
  const pendingQueue = usePendingQueue();
  const { approveDetection, dismissDetection } = useSessionStore();
  
  return (
    <div className={cn(
      'flex flex-col rounded-xl border border-verse-border bg-verse-surface',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-verse-border">
        <div className="flex items-center gap-3">
          <h3 className="font-body text-sm font-semibold text-verse-text tracking-wide uppercase">
            Detected
          </h3>
          {pendingQueue.length > 0 && (
            <span className="flex items-center justify-center min-w-[24px] h-6 px-2 text-xs font-bold text-verse-bg bg-gold-500 rounded-full">
              {pendingQueue.length}
            </span>
          )}
        </div>
      </div>
      
      {/* Queue content */}
      <div className="flex-1 overflow-y-auto p-4 min-h-[200px] max-h-[500px]">
        {pendingQueue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="text-4xl mb-4 opacity-50">👂</div>
            <p className="text-verse-subtle text-sm">
              Waiting for scripture references...
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {pendingQueue.map((item) => (
                <DetectionCard
                  key={item.id}
                  item={item}
                  onApprove={() => approveDetection(item.id)}
                  onDismiss={() => dismissDetection(item.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
