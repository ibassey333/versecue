// ============================================
// Editable Session Review Modal
// Premium: Review & Edit AI notes before saving
// ============================================
'use client';

import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

import { useState, useEffect } from 'react';
import { X, Save, Download, RefreshCw, AlertTriangle, Check, Plus, Trash2, Edit3 } from 'lucide-react';
import { SessionData, ScriptureNote, generateSessionPreview, saveSession } from '@/lib/sessions';
// PDF generation handled inline
import { useSessionStore } from '@/stores/session';
import { cn } from '@/lib/utils';

interface EditableSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (session: SessionData) => void;
}

type Step = 'generating' | 'review' | 'saving' | 'complete';

export function EditableSessionModal({ isOpen, onClose, onSaved }: EditableSessionModalProps) {
  const transcript = useSessionStore((s) => s.transcript);
  const pendingQueue = useSessionStore((s) => s.pendingQueue);
  const approvedQueue = useSessionStore((s) => s.approvedQueue);
  
  // Map queue items to detection format
  const detections = [...pendingQueue, ...approvedQueue].map(item => ({
    reference: item.reference,
    verseText: item.verseText || '',
    matchedText: (item as any).matchedText || item.reference.reference,
    detectedAt: item.detectedAt || new Date(),
    confidence: 'high' as const,
    confidenceScore: 0.9,
    detectionType: 'phrase' as const,
    id: item.id,
    translation: item.translation || 'KJV',
  }));
  const [sessionStartTime] = useState(() => new Date());
  const newSession = useSessionStore((s) => s.newSession);
  
  const [step, setStep] = useState<Step>('generating');
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Editable fields
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const [editingPointIndex, setEditingPointIndex] = useState<number | null>(null);
  const [newPointText, setNewPointText] = useState('');
  
  // Generate preview when modal opens
  useEffect(() => {
    if (isOpen && transcript.length > 0) {
      generatePreview();
    }
  }, [isOpen]);
  
  const generatePreview = async () => {
    setStep('generating');
    setError(null);
    
    try {
      const preview = await generateSessionPreview(
        transcript,
        detections,
        sessionStartTime || new Date()
      );
      
      setSessionData(preview);
      setTitle(preview.title);
      setSummary(preview.summary);
      setKeyPoints(preview.key_points || []);
      setStep('review');
    } catch (err) {
      console.error('Preview generation failed:', err);
      setError('Failed to generate preview. Please try again.');
      setStep('review');
    }
  };
  
  const handleSave = async () => {
    if (!sessionData) return;
    
    setStep('saving');
    
    // Apply edits to session data
    const editedData: SessionData = {
      ...sessionData,
      title,
      summary,
      key_points: keyPoints,
    };
    
    try {
      const saved = await saveSession(editedData);
      setSessionData(saved);
      setStep('complete');
      onSaved?.(saved!);
    } catch (err) {
      console.error('Save failed:', err);
      setError('Failed to save session. Please try again.');
      setStep('review');
    }
  };
  
  const handleDownloadWord = async () => {
    if (!sessionData) return;
    
    const editedData: SessionData = {
      ...sessionData,
      title,
      summary,
      key_points: keyPoints,
    };
    
    try {
      // Create Word document with professional formatting
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // Title
            new Paragraph({
              children: [
                new TextRun({
                  text: editedData.title,
                  bold: true,
                  size: 48,
                  color: "2E74B5",
                }),
              ],
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
            
            // Date and Duration
            new Paragraph({
              children: [
                new TextRun({
                  text: `${new Date(editedData.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })} • ${editedData.duration_minutes} minutes`,
                  size: 22,
                  color: "666666",
                  italics: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 600 },
            }),
            
            // Summary Header
            new Paragraph({
              children: [
                new TextRun({
                  text: "Summary",
                  bold: true,
                  size: 32,
                  color: "2E74B5",
                }),
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 },
            }),
            
            // Summary Content
            new Paragraph({
              children: [
                new TextRun({
                  text: editedData.summary,
                  size: 24,
                }),
              ],
              spacing: { after: 400 },
            }),
            
            // Key Points Header
            new Paragraph({
              children: [
                new TextRun({
                  text: "Key Points",
                  bold: true,
                  size: 32,
                  color: "2E74B5",
                }),
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 },
            }),
            
            // Key Points List
            ...editedData.key_points.map((point, index) => 
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${index + 1}. `,
                    bold: true,
                    size: 24,
                  }),
                  new TextRun({
                    text: point,
                    size: 24,
                  }),
                ],
                spacing: { after: 120 },
              })
            ),
            
            // Scriptures Header
            new Paragraph({
              children: [
                new TextRun({
                  text: `Scriptures Referenced (${editedData.scriptures.length})`,
                  bold: true,
                  size: 32,
                  color: "2E74B5",
                }),
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 },
            }),
            
            // Scriptures List
            ...editedData.scriptures.map(scripture => 
              new Paragraph({
                children: [
                  new TextRun({
                    text: `• ${scripture.reference}`,
                    bold: true,
                    size: 24,
                  }),
                  scripture.verse_text ? new TextRun({
                    text: ` — "${scripture.verse_text.substring(0, 100)}${scripture.verse_text.length > 100 ? '...' : ''}"`,
                    size: 22,
                    italics: true,
                    color: "555555",
                  }) : new TextRun({ text: "" }),
                ],
                spacing: { after: 100 },
              })
            ),
            
            // Footer
            new Paragraph({
              children: [
                new TextRun({
                  text: "─".repeat(50),
                  color: "CCCCCC",
                }),
              ],
              spacing: { before: 600 },
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Generated by VerseCue",
                  size: 20,
                  color: "999999",
                  italics: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }],
      });
      
      // Generate and download
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${editedData.title.replace(/[^a-z0-9]/gi, '_')}.docx`);
    } catch (err) {
      console.error('Word download failed:', err);
      setError('Failed to generate Word document.');
    }
  };
  
  const handleDownloadText = async () => {
    if (!sessionData) return;
    
    const editedData: SessionData = {
      ...sessionData,
      title,
      summary,
      key_points: keyPoints,
    };
    
    try {
      const content = [
        editedData.title,
        '═'.repeat(50),
        `${new Date(editedData.date).toLocaleDateString()} • ${editedData.duration_minutes} minutes`,
        '',
        'SUMMARY',
        '─'.repeat(30),
        editedData.summary,
        '',
        'KEY POINTS',
        '─'.repeat(30),
        ...editedData.key_points.map((p, i) => `${i + 1}. ${p}`),
        '',
        `SCRIPTURES (${editedData.scriptures.length})`,
        '─'.repeat(30),
        ...editedData.scriptures.map(s => `• ${s.reference}${s.verse_text ? ` — "${s.verse_text.substring(0, 80)}..."` : ''}`),
        '',
        '─'.repeat(50),
        'Generated by VerseCue',
      ].join('\n');
      
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${editedData.title.replace(/[^a-z0-9]/gi, '_')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      setError('Failed to download notes.');
    }
  };
  
  const handleStartNewSession = () => {
    newSession();
    onClose();
  };
  
  // Key points management
  const addKeyPoint = () => {
    if (newPointText.trim()) {
      setKeyPoints([...keyPoints, newPointText.trim()]);
      setNewPointText('');
    }
  };
  
  const removeKeyPoint = (index: number) => {
    setKeyPoints(keyPoints.filter((_, i) => i !== index));
  };
  
  const updateKeyPoint = (index: number, text: string) => {
    const updated = [...keyPoints];
    updated[index] = text;
    setKeyPoints(updated);
    setEditingPointIndex(null);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-verse-surface border border-verse-border shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-verse-border">
          <h2 className="text-xl font-display font-bold text-verse-text">
            {step === 'generating' && 'Generating Notes...'}
            {step === 'review' && 'Review & Edit Notes'}
            {step === 'saving' && 'Saving...'}
            {step === 'complete' && 'Notes Saved!'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-verse-muted hover:text-verse-text hover:bg-verse-border transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Generating State */}
          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-gold-500/30 border-t-gold-500 rounded-full animate-spin mb-4" />
              <p className="text-verse-muted">AI is analyzing the sermon...</p>
              <p className="text-verse-subtle text-sm mt-2">This may take a moment</p>
            </div>
          )}
          
          {/* Review/Edit State */}
          {step === 'review' && (
            <div className="space-y-6">
              {/* Needs Review Warning */}
              {sessionData?.needs_review && sessionData.needs_review.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-amber-400 mb-1">Review Needed</h4>
                      <ul className="text-sm text-amber-300/80 space-y-1">
                        {sessionData.needs_review.map((item, i) => (
                          <li key={i}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Error */}
              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                  {error}
                </div>
              )}
              
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-verse-muted mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-verse-bg border border-verse-border text-verse-text focus:border-gold-500 focus:outline-none transition-colors"
                />
              </div>
              
              {/* Summary */}
              <div>
                <label className="block text-sm font-medium text-verse-muted mb-2">
                  Summary
                  <span className="text-verse-subtle ml-2 font-normal">(edit if needed)</span>
                </label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl bg-verse-bg border border-verse-border text-verse-text focus:border-gold-500 focus:outline-none transition-colors resize-none"
                />
              </div>
              
              {/* Key Points */}
              <div>
                <label className="block text-sm font-medium text-verse-muted mb-2">
                  Key Points
                  <span className="text-verse-subtle ml-2 font-normal">(click to edit, or add new)</span>
                </label>
                <div className="space-y-2">
                  {keyPoints.map((point, index) => (
                    <div key={index} className="flex items-start gap-2">
                      {editingPointIndex === index ? (
                        <input
                          type="text"
                          defaultValue={point}
                          autoFocus
                          onBlur={(e) => updateKeyPoint(index, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateKeyPoint(index, e.currentTarget.value);
                            }
                            if (e.key === 'Escape') {
                              setEditingPointIndex(null);
                            }
                          }}
                          className="flex-1 px-3 py-2 rounded-lg bg-verse-bg border border-gold-500 text-verse-text focus:outline-none"
                        />
                      ) : (
                        <div
                          onClick={() => setEditingPointIndex(index)}
                          className="flex-1 px-3 py-2 rounded-lg bg-verse-bg border border-verse-border text-verse-text cursor-pointer hover:border-verse-muted transition-colors"
                        >
                          <span className="text-gold-500 mr-2">•</span>
                          {point}
                        </div>
                      )}
                      <button
                        onClick={() => removeKeyPoint(index)}
                        className="p-2 rounded-lg text-verse-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  {/* Add new point */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newPointText}
                      onChange={(e) => setNewPointText(e.target.value)}
                      placeholder="Add a key point..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addKeyPoint();
                      }}
                      className="flex-1 px-3 py-2 rounded-lg bg-verse-bg border border-verse-border text-verse-text placeholder:text-verse-subtle focus:border-gold-500 focus:outline-none transition-colors"
                    />
                    <button
                      onClick={addKeyPoint}
                      disabled={!newPointText.trim()}
                      className="p-2 rounded-lg bg-gold-500/10 text-gold-500 hover:bg-gold-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Scripture List (read-only preview) */}
              {sessionData?.scriptures && sessionData.scriptures.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-verse-muted mb-2">
                    Scriptures Referenced ({sessionData.scriptures.length})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {sessionData.scriptures.map((s, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-full bg-verse-bg border border-verse-border text-sm text-verse-text"
                      >
                        {s.reference}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Regenerate Option */}
              <div className="pt-4 border-t border-verse-border">
                <button
                  onClick={generatePreview}
                  className="flex items-center gap-2 text-sm text-verse-muted hover:text-verse-text transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate AI summary
                </button>
              </div>
            </div>
          )}
          
          {/* Saving State */}
          {step === 'saving' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-gold-500/30 border-t-gold-500 rounded-full animate-spin mb-4" />
              <p className="text-verse-muted">Saving your notes...</p>
            </div>
          )}
          
          {/* Complete State */}
          {step === 'complete' && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold text-verse-text mb-2">Notes Saved!</h3>
              <p className="text-verse-muted text-center mb-6">
                Your sermon notes have been saved successfully.
              </p>
              
              {/* Summary Preview */}
              <div className="w-full max-w-md p-4 rounded-xl bg-verse-bg border border-verse-border mb-6">
                <h4 className="font-medium text-verse-text mb-2">{title}</h4>
                <p className="text-sm text-verse-muted line-clamp-3">{summary}</p>
                {keyPoints.length > 0 && (
                  <p className="text-xs text-verse-subtle mt-2">
                    {keyPoints.length} key points • {sessionData?.scriptures?.length || 0} scriptures
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-verse-border bg-verse-bg/50">
          {step === 'review' && (
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-verse-muted hover:text-verse-text transition-colors"
              >
                Cancel
              </button>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadWord}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Word (.docx)
                  </button>
                  <button
                    onClick={handleDownloadText}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-verse-border text-verse-text hover:bg-verse-muted/20 transition-colors text-sm"
                  >
                    .txt
                  </button>
                </div>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gold-500 text-verse-bg font-semibold hover:bg-gold-400 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save Notes
                </button>
              </div>
            </div>
          )}
          
          {step === 'complete' && (
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleDownloadWord}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gold-500 text-verse-bg font-semibold hover:bg-gold-400 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Word
              </button>
              <button
                onClick={handleStartNewSession}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-verse-border text-verse-text hover:bg-verse-muted/20 transition-colors"
              >
                Start New Session
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
