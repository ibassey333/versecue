"use client";

import { History, RotateCcw, X, User, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SessionVersion {
  id: string;
  version_number: number;
  title: string;
  summary: string;
  key_points: string[];
  scriptures: any[];
  editor_name: string | null;
  change_note: string | null;
  created_at: string;
}

interface VersionHistorySidebarProps {
  isOpen: boolean;
  versions: SessionVersion[];
  currentVersion: number;
  onRestore: (version: SessionVersion) => void;
  onClose: () => void;
}

export function VersionHistorySidebar({
  isOpen,
  versions,
  currentVersion,
  onRestore,
  onClose,
}: VersionHistorySidebarProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 86400000) {
      if (diff < 3600000) {
        const mins = Math.floor(diff / 60000);
        return mins <= 1 ? 'Just now' : `${mins}m ago`;
      }
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    }
    
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return days === 1 ? 'Yesterday' : `${days} days ago`;
    }
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed right-0 top-0 h-full w-80 bg-verse-surface border-l border-verse-border z-40",
          "transform transition-transform duration-300 ease-out",
          "flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        style={{ top: '65px', height: 'calc(100vh - 65px)' }}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-verse-border">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-gold-500" />
            <h3 className="font-semibold text-verse-text">Version History</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-verse-muted hover:text-verse-text hover:bg-verse-border transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-3 bg-gold-500/5 border-b border-verse-border">
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-0.5 bg-gold-500 text-verse-bg rounded text-xs font-bold">
              v{currentVersion}
            </span>
            <span className="text-gold-400 font-medium">Current Version</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="w-12 h-12 rounded-xl bg-verse-bg flex items-center justify-center mb-3">
                <History className="w-6 h-6 text-verse-muted" />
              </div>
              <p className="text-verse-muted text-sm">No previous versions</p>
            </div>
          ) : (
            <div className="divide-y divide-verse-border">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="group px-4 py-4 hover:bg-verse-bg/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-1.5 py-0.5 bg-verse-border rounded text-xs font-medium text-verse-text">
                          v{version.version_number}
                        </span>
                        <span className="text-xs text-verse-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(version.created_at)}
                        </span>
                      </div>

                      {version.change_note && (
                        <p className="text-sm text-verse-text mb-2 line-clamp-2">
                          {version.change_note}
                        </p>
                      )}

                      {version.editor_name && (
                        <div className="flex items-center gap-1 text-xs text-verse-muted">
                          <User className="w-3 h-3" />
                          <span>{version.editor_name}</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => onRestore(version)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-verse-muted opacity-0 group-hover:opacity-100 hover:text-gold-400 hover:bg-gold-500/10 transition-all"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Restore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-verse-border bg-verse-bg/50">
          <p className="text-xs text-verse-muted text-center">
            Click "Save Version" to create a snapshot
          </p>
        </div>
      </aside>
    </>
  );
}
