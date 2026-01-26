"use client";

import { useState, useCallback } from 'react';
import { X, Upload, FileText, Check, AlertCircle, Loader2, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { importSongFiles, ParsedSong } from '@/lib/songImport';
import { useOrg } from '@/contexts/OrgContext';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (count: number) => void;
}

export function SongImportModal({ isOpen, onClose, onImportComplete }: ImportModalProps) {
  const { org } = useOrg();
  const [dragActive, setDragActive] = useState(false);
  const [parsedSongs, setParsedSongs] = useState<ParsedSong[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [format, setFormat] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'complete'>('upload');

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const result = await importSongFiles(files);
    setParsedSongs(result.songs);
    setParseErrors(result.errors);
    setFormat(result.format);
    
    if (result.songs.length > 0) {
      setStep('preview');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const handleImport = async () => {
    if (!org?.id || parsedSongs.length === 0) return;
    
    setIsImporting(true);
    
    try {
      const response = await fetch('/api/songs/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songs: parsedSongs,
          organizationId: org.id,
        }),
      });
      
      const result = await response.json();
      setImportResult(result);
      setStep('complete');
      onImportComplete?.(result.imported);
    } catch (error) {
      console.error('Import error:', error);
      setImportResult({
        imported: 0,
        skipped: 0,
        errors: ['Failed to import songs'],
      });
      setStep('complete');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setParsedSongs([]);
    setParseErrors([]);
    setFormat('');
    setImportResult(null);
    setStep('upload');
    onClose();
  };

  const removeSong = (index: number) => {
    setParsedSongs(prev => prev.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[80vh] bg-verse-surface border border-verse-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-verse-border">
          <div>
            <h2 className="text-lg font-bold text-verse-text">Import Songs</h2>
            <p className="text-xs text-verse-muted">
              ProPresenter, OpenSong, CCLI, ChordPro, or plain text
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-verse-muted hover:text-verse-text rounded-lg hover:bg-verse-border transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={cn(
                'border-2 border-dashed rounded-xl p-12 text-center transition-all',
                dragActive
                  ? 'border-gold-500 bg-gold-500/10'
                  : 'border-verse-border hover:border-verse-muted'
              )}
            >
              <Upload className={cn(
                'w-12 h-12 mx-auto mb-4',
                dragActive ? 'text-gold-500' : 'text-verse-muted'
              )} />
              <p className="text-verse-text font-medium mb-2">
                Drag & drop song files here
              </p>
              <p className="text-verse-muted text-sm mb-4">
                or click to browse
              </p>
              <input
                type="file"
                multiple
                accept=".pro,.pro5,.pro6,.pro7,.xml,.txt,.usr,.cho,.chopro,.chordpro"
                onChange={handleFileInput}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500 text-verse-bg font-medium rounded-lg cursor-pointer hover:bg-gold-400 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Choose Files
              </label>
              
              <div className="mt-6 pt-6 border-t border-verse-border">
                <p className="text-xs text-verse-subtle mb-2">Supported formats:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {['ProPresenter', 'OpenSong', 'CCLI', 'ChordPro', 'Plain Text'].map((fmt) => (
                    <span key={fmt} className="px-2 py-1 bg-verse-bg text-verse-muted text-xs rounded">
                      {fmt}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-verse-text font-medium">
                    {parsedSongs.length} song{parsedSongs.length !== 1 ? 's' : ''} ready to import
                  </p>
                  {format && (
                    <p className="text-xs text-verse-muted">Format: {format}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setParsedSongs([]);
                    setStep('upload');
                  }}
                  className="text-xs text-verse-muted hover:text-verse-text"
                >
                  Choose different files
                </button>
              </div>

              {parseErrors.length > 0 && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-xs text-red-400 font-medium mb-1">Some files could not be parsed:</p>
                  {parseErrors.map((err, i) => (
                    <p key={i} className="text-xs text-red-400/80">• {err}</p>
                  ))}
                </div>
              )}

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {parsedSongs.map((song, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-verse-bg border border-verse-border rounded-lg"
                  >
                    <Music className="w-4 h-4 text-gold-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-verse-text truncate">{song.title}</p>
                      <p className="text-xs text-verse-muted truncate">{song.artist}</p>
                    </div>
                    <span className="text-xs text-verse-subtle">
                      {song.lyrics.split('\n\n').length} sections
                    </span>
                    <button
                      onClick={() => removeSong(index)}
                      className="p-1 text-verse-muted hover:text-red-400 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'complete' && importResult && (
            <div className="text-center py-8">
              {importResult.imported > 0 ? (
                <>
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-verse-text mb-2">
                    Import Complete!
                  </h3>
                  <p className="text-verse-muted mb-4">
                    {importResult.imported} song{importResult.imported !== 1 ? 's' : ''} imported
                    {importResult.skipped > 0 && `, ${importResult.skipped} skipped (duplicates)`}
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold text-verse-text mb-2">
                    Import Failed
                  </h3>
                </>
              )}
              
              {importResult.errors.length > 0 && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-left">
                  <p className="text-xs text-red-400 font-medium mb-1">Errors:</p>
                  {importResult.errors.slice(0, 5).map((err, i) => (
                    <p key={i} className="text-xs text-red-400/80">• {err}</p>
                  ))}
                  {importResult.errors.length > 5 && (
                    <p className="text-xs text-red-400/60 mt-1">
                      ...and {importResult.errors.length - 5} more
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-verse-border bg-verse-bg/50">
          {step === 'preview' && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-verse-muted hover:text-verse-text rounded-lg hover:bg-verse-border transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={isImporting || parsedSongs.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-verse-bg font-medium rounded-lg hover:bg-gold-400 transition-colors disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import {parsedSongs.length} Song{parsedSongs.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </>
          )}
          {step === 'complete' && (
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gold-500 text-verse-bg font-medium rounded-lg hover:bg-gold-400 transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
