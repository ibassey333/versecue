"use client";

import { useState, useCallback, useRef } from 'react';
import { X, Upload, FileText, Check, AlertCircle, Loader2, Music, FolderOpen } from 'lucide-react';
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
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [parsedSongs, setParsedSongs] = useState<ParsedSong[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [format, setFormat] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState({ current: 0, total: 0 });
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload');

  // Parse files in batches to avoid UI freeze
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => 
      f.name.match(/\.(pro|pro5|pro6|pro7|xml|txt|usr|cho|chopro|chordpro|json)$/i)
    );
    
    if (fileArray.length === 0) {
      setParseErrors(['No supported files found']);
      return;
    }

    setIsParsing(true);
    setParseProgress({ current: 0, total: fileArray.length });
    
    const allSongs: ParsedSong[] = [];
    const allErrors: string[] = [];
    const formats = new Set<string>();
    
    // Process in batches of 50
    const BATCH_SIZE = 50;
    
    for (let i = 0; i < fileArray.length; i += BATCH_SIZE) {
      const batch = fileArray.slice(i, i + BATCH_SIZE);
      
      const results = await Promise.all(
        batch.map(file => importSongFiles([file]))
      );
      
      results.forEach(result => {
        allSongs.push(...result.songs);
        allErrors.push(...result.errors);
        if (result.format !== 'unknown') formats.add(result.format);
      });
      
      setParseProgress({ current: Math.min(i + BATCH_SIZE, fileArray.length), total: fileArray.length });
      
      // Small delay to allow UI updates
      await new Promise(r => setTimeout(r, 10));
    }
    
    setParsedSongs(allSongs);
    setParseErrors(allErrors.slice(0, 20)); // Limit displayed errors
    setFormat(Array.from(formats).join(', ') || 'Text');
    setIsParsing(false);
    
    if (allSongs.length > 0) {
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

  const handleFolderSelect = () => {
    folderInputRef.current?.click();
  };

  const handleImport = async () => {
    if (!org?.id || parsedSongs.length === 0) return;
    
    setIsImporting(true);
    setStep('importing');
    setImportProgress({ current: 0, total: parsedSongs.length });
    
    try {
      // For large imports (>500), use bulk endpoint with batching
      if (parsedSongs.length > 500) {
        const CHUNK_SIZE = 500;
        let totalImported = 0;
        let totalSkipped = 0;
        const allErrors: string[] = [];
        
        for (let i = 0; i < parsedSongs.length; i += CHUNK_SIZE) {
          const chunk = parsedSongs.slice(i, i + CHUNK_SIZE);
          
          const response = await fetch('/api/songs/bulk-import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              songs: chunk,
              organizationId: org.id,
            }),
          });
          
          const result = await response.json();
          totalImported += result.imported || 0;
          totalSkipped += result.skipped || 0;
          if (result.errors) allErrors.push(...result.errors);
          
          setImportProgress({ current: Math.min(i + CHUNK_SIZE, parsedSongs.length), total: parsedSongs.length });
        }
        
        setImportResult({
          imported: totalImported,
          skipped: totalSkipped,
          errors: allErrors,
        });
      } else {
        // Small imports use regular endpoint
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
      }
      
      setStep('complete');
      onImportComplete?.(importResult?.imported || 0);
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
    setParseProgress({ current: 0, total: 0 });
    setImportProgress({ current: 0, total: 0 });
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
              Supports 10,000+ songs • ProPresenter, CCLI, ChordPro, Text
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
            <>
              {isParsing ? (
                <div className="text-center py-12">
                  <Loader2 className="w-12 h-12 text-gold-500 animate-spin mx-auto mb-4" />
                  <p className="text-verse-text font-medium mb-2">Parsing files...</p>
                  <p className="text-verse-muted text-sm">
                    {parseProgress.current} / {parseProgress.total} files
                  </p>
                  <div className="w-64 h-2 bg-verse-border rounded-full mx-auto mt-4 overflow-hidden">
                    <div 
                      className="h-full bg-gold-500 transition-all duration-300"
                      style={{ width: `${(parseProgress.current / parseProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  className={cn(
                    'border-2 border-dashed rounded-xl p-8 text-center transition-all',
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
                    Drag & drop song files or folder
                  </p>
                  <p className="text-verse-muted text-sm mb-4">
                    Works with thousands of files
                  </p>
                  
                  <div className="flex items-center justify-center gap-3">
                    <input
                      type="file"
                      multiple
                      accept=".pro,.pro5,.pro6,.pro7,.xml,.txt,.usr,.cho,.chopro,.chordpro,.json"
                      onChange={handleFileInput}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-verse-border text-verse-text font-medium rounded-lg cursor-pointer hover:bg-verse-muted/30 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      Choose Files
                    </label>
                    
                    {/* Folder input with webkitdirectory */}
                    <input
                      ref={folderInputRef}
                      type="file"
                      multiple
                      // @ts-ignore - webkitdirectory is not in types but works
                      webkitdirectory=""
                      onChange={handleFileInput}
                      className="hidden"
                    />
                    <button
                      onClick={handleFolderSelect}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500 text-verse-bg font-medium rounded-lg hover:bg-gold-400 transition-colors"
                    >
                      <FolderOpen className="w-4 h-4" />
                      Choose Folder
                    </button>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-verse-border">
                    <p className="text-xs text-verse-subtle mb-2">Supported formats:</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {['ProPresenter', 'OpenSong', 'CCLI', 'ChordPro', 'JSON', 'Plain Text'].map((fmt) => (
                        <span key={fmt} className="px-2 py-1 bg-verse-bg text-verse-muted text-xs rounded">
                          {fmt}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-verse-subtle mt-3">
                      💡 EasyWorship: Export songs as text files first, then import here
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-verse-text font-medium">
                    {parsedSongs.length.toLocaleString()} song{parsedSongs.length !== 1 ? 's' : ''} ready to import
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
                  <p className="text-xs text-red-400 font-medium mb-1">
                    {parseErrors.length} file{parseErrors.length !== 1 ? 's' : ''} could not be parsed:
                  </p>
                  {parseErrors.slice(0, 5).map((err, i) => (
                    <p key={i} className="text-xs text-red-400/80">• {err}</p>
                  ))}
                  {parseErrors.length > 5 && (
                    <p className="text-xs text-red-400/60 mt-1">
                      ...and {parseErrors.length - 5} more
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {parsedSongs.slice(0, 100).map((song, index) => (
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
                      {song.lyrics.split("\n\n").filter(Boolean).length} sections
                    </span>
                    <button
                      onClick={() => removeSong(index)}
                      className="p-1 text-verse-muted hover:text-red-400 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {parsedSongs.length > 100 && (
                  <p className="text-xs text-verse-subtle text-center py-2">
                    ...and {(parsedSongs.length - 100).toLocaleString()} more songs
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-gold-500 animate-spin mx-auto mb-4" />
              <p className="text-verse-text font-medium mb-2">Importing songs...</p>
              <p className="text-verse-muted text-sm">
                {importProgress.current.toLocaleString()} / {importProgress.total.toLocaleString()} songs
              </p>
              <div className="w-64 h-2 bg-verse-border rounded-full mx-auto mt-4 overflow-hidden">
                <div 
                  className="h-full bg-gold-500 transition-all duration-300"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-verse-subtle mt-4">
                This may take a few minutes for large libraries
              </p>
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
                    {importResult.imported.toLocaleString()} song{importResult.imported !== 1 ? 's' : ''} imported
                    {importResult.skipped > 0 && `, ${importResult.skipped.toLocaleString()} skipped (duplicates)`}
                  </p>
                </>
              ) : importResult.skipped > 0 ? (
                <>
                  <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-yellow-400" />
                  </div>
                  <h3 className="text-xl font-bold text-verse-text mb-2">
                    Already in Library
                  </h3>
                  <p className="text-verse-muted mb-4">
                    {importResult.skipped.toLocaleString()} song{importResult.skipped !== 1 ? 's' : ''} skipped (already exist)
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
                <Upload className="w-4 h-4" />
                Import {parsedSongs.length.toLocaleString()} Song{parsedSongs.length !== 1 ? 's' : ''}
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
