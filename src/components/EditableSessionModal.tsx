// ============================================
// Premium Editable Session Modal
// Full-featured review & edit before save
// ============================================
'use client';

import { useState, useEffect } from 'react';
import { X, Save, Download, RefreshCw, AlertTriangle, Check, Plus, Trash2, FileText, FileDown } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { SessionData, ScriptureNote, generateSessionPreview, saveSession } from '@/lib/sessions';
import { createClient } from '@/lib/supabase/client';
import { generatePremiumPDF } from '@/lib/pdf';
import { useSessionStore } from '@/stores/session';
import { cn } from '@/lib/utils';

interface EditableSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (session: SessionData) => void;
}

interface EnhancedSessionData extends SessionData {
  themes?: string[];
  application_points?: string[];
  quotable_quotes?: string[];
}

type Step = 'generating' | 'review' | 'saving' | 'complete';

export function EditableSessionModal({ isOpen, onClose, onSaved }: EditableSessionModalProps) {
  const transcript = useSessionStore((s) => s.transcript);
  const pendingQueue = useSessionStore((s) => s.pendingQueue);
  const approvedQueue = useSessionStore((s) => s.approvedQueue);
  const newSession = useSessionStore((s) => s.newSession);
  
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
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Use the SSR browser client for auth consistency
  const supabase = createClient();
  
  // Get current user's org on mount - query organizations by owner_id
  useEffect(() => {
    async function getOrgInfo() {
      console.log('[Modal] Getting org info...');
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        console.log('[Modal] No session, waiting...');
        return;
      }
      
      const userId = session.user.id;
      setUserId(userId);
      console.log('[Modal] User ID:', userId);
      
      // Try organizations table (user is owner)
      const { data: ownedOrg, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', userId)
        .single();
      
      console.log('[Modal] Owned org query:', ownedOrg, orgError);
      
      if (ownedOrg?.id) {
        setOrgId(ownedOrg.id);
        console.log('[Modal] ✅ Got org (owner):', ownedOrg.id);
        return;
      }
      
      // Fallback: try organization_members (user is member)
      const { data: membership, error: memError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId)
        .maybeSingle();
      
      console.log('[Modal] Membership query:', membership, memError);
      
      if (membership?.organization_id) {
        setOrgId(membership.organization_id);
        console.log('[Modal] ✅ Got org (member):', membership.organization_id);
        return;
      }
      
      console.error('[Modal] ❌ Could not find organization for user');
    }
    
    getOrgInfo();
    
    // Also listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        getOrgInfo();
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);
  const [step, setStep] = useState<Step>('generating');
  const [sessionData, setSessionData] = useState<EnhancedSessionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Editable fields
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const [themes, setThemes] = useState<string[]>([]);
  const [applicationPoints, setApplicationPoints] = useState<string[]>([]);
  const [editingPointIndex, setEditingPointIndex] = useState<number | null>(null);
  const [newPointText, setNewPointText] = useState('');
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  
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
        sessionStartTime
      );
      
      setSessionData(preview as EnhancedSessionData);
      setTitle(preview.title);
      setSummary(preview.summary);
      setKeyPoints(preview.key_points || []);
      setThemes((preview as EnhancedSessionData).themes || []);
      setApplicationPoints((preview as EnhancedSessionData).application_points || []);
      setStep('review');
    } catch (err) {
      console.error('Preview generation failed:', err);
      setError('Failed to generate preview. Please try again.');
      setStep('review');
      // Set defaults so user can still enter manually
      setTitle(`Sermon - ${new Date().toLocaleDateString()}`);
      setSummary('');
      setKeyPoints([]);
    }
  };
  
  const handleSave = async () => {
    if (!sessionData) return;
    
    setStep('saving');
    setError(null);
    
    // Apply edits to session data
    const editedData: EnhancedSessionData = {
      ...sessionData,
      title,
      summary,
      key_points: keyPoints,
      themes,
      application_points: applicationPoints,
    };
    
    try {
      console.log('[EditableModal] Saving session...', editedData);
      const saved = await saveSession(editedData, orgId || undefined, userId || undefined);
      console.log('[EditableModal] Save result:', saved);
      
      if (saved) {
        setSessionData(saved as EnhancedSessionData);
        setStep('complete');
        onSaved?.(saved);
      } else {
        throw new Error('Save returned null');
      }
    } catch (err) {
      console.error('[EditableModal] Save failed:', err);
      setError('Failed to save session. Please try again or download your notes.');
      setStep('review');
    }
  };
  
  const getEditedData = (): EnhancedSessionData => ({
    ...sessionData!,
    title,
    summary,
    key_points: keyPoints,
    themes,
    application_points: applicationPoints,
  });
  
  const handleDownloadPDF = () => {
    try {
      generatePremiumPDF(getEditedData());
      setShowDownloadMenu(false);
    } catch (err) {
      console.error('PDF generation failed:', err);
      setError('Failed to generate PDF. Try Word format instead.');
    }
  };
  
  const handleDownloadWord = async () => {
    const editedData = getEditedData();
    
    try {
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
                  size: 56,
                  color: "1a365d",
                }),
              ],
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            }),
            
            // Decorative line
            new Paragraph({
              children: [
                new TextRun({
                  text: "━".repeat(60),
                  color: "c6a962",
                  size: 20,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
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
                  })}  •  ${editedData.duration_minutes} minutes  •  ${editedData.scriptures.length} scriptures`,
                  size: 22,
                  color: "718096",
                  italics: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
            
            // Themes
            ...(editedData.themes && editedData.themes.length > 0 ? [
              new Paragraph({
                children: editedData.themes.map((theme, i) => 
                  new TextRun({
                    text: i === 0 ? theme : `   •   ${theme}`,
                    bold: true,
                    size: 22,
                    color: "744210",
                  })
                ),
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
              }),
            ] : []),
            
            // Summary Header
            new Paragraph({
              children: [
                new TextRun({
                  text: "Summary",
                  bold: true,
                  size: 32,
                  color: "1a365d",
                }),
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 300, after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "━".repeat(15), color: "c6a962", size: 20 }),
              ],
              spacing: { after: 200 },
            }),
            
            // Summary Content
            new Paragraph({
              children: [
                new TextRun({
                  text: editedData.summary,
                  size: 24,
                  color: "2d3748",
                }),
              ],
              spacing: { after: 400, line: 360 },
            }),
            
            // Key Points Header
            new Paragraph({
              children: [
                new TextRun({
                  text: "Key Points",
                  bold: true,
                  size: 32,
                  color: "1a365d",
                }),
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 300, after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "━".repeat(15), color: "c6a962", size: 20 }),
              ],
              spacing: { after: 200 },
            }),
            
            // Key Points List
            ...editedData.key_points.map((point, index) => 
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${index + 1}.  `,
                    bold: true,
                    size: 24,
                    color: "c6a962",
                  }),
                  new TextRun({
                    text: point,
                    size: 24,
                    color: "2d3748",
                  }),
                ],
                spacing: { after: 150, line: 340 },
              })
            ),
            
            // Application Points (if any)
            ...(editedData.application_points && editedData.application_points.length > 0 ? [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Application",
                    bold: true,
                    size: 32,
                    color: "1a365d",
                  }),
                ],
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 100 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "━".repeat(15), color: "c6a962", size: 20 }),
                ],
                spacing: { after: 200 },
              }),
              ...editedData.application_points.map(point => 
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "→  ",
                      bold: true,
                      size: 24,
                      color: "744210",
                    }),
                    new TextRun({
                      text: point,
                      size: 24,
                      color: "2d3748",
                      italics: true,
                    }),
                  ],
                  spacing: { after: 120 },
                })
              ),
            ] : []),
            
            // Page break before scriptures
            new Paragraph({
              children: [],
              pageBreakBefore: true,
            }),
            
            // Scriptures Header
            new Paragraph({
              children: [
                new TextRun({
                  text: `Scripture References (${editedData.scriptures.length})`,
                  bold: true,
                  size: 32,
                  color: "1a365d",
                }),
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "━".repeat(15), color: "c6a962", size: 20 }),
              ],
              spacing: { after: 300 },
            }),
            
            // Scriptures List
            ...editedData.scriptures.flatMap(scripture => [
              new Paragraph({
                children: [
                  new TextRun({
                    text: scripture.reference,
                    bold: true,
                    size: 24,
                    color: "744210",
                  }),
                ],
                spacing: { before: 100, after: 50 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: scripture.verse_text 
                      ? `"${scripture.verse_text.length > 180 ? scripture.verse_text.substring(0, 180) + '...' : scripture.verse_text}"`
                      : '',
                    size: 22,
                    color: "718096",
                    italics: true,
                  }),
                ],
                spacing: { after: 200 },
              }),
            ]),
            
            // Footer
            new Paragraph({
              children: [
                new TextRun({ text: "━".repeat(40), color: "e2e8f0", size: 20 }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 400, after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Generated by VerseCue",
                  bold: true,
                  size: 22,
                  color: "1a365d",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Real-time Scripture Detection for Churches",
                  size: 18,
                  color: "718096",
                  italics: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }],
      });
      
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${editedData.title.replace(/[^a-z0-9]/gi, '_')}.docx`);
      setShowDownloadMenu(false);
    } catch (err) {
      console.error('Word download failed:', err);
      setError('Failed to generate Word document.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-verse-surface border border-verse-border shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-verse-border bg-gradient-to-r from-verse-surface to-verse-bg">
          <div>
            <h2 className="text-xl font-display font-bold text-verse-text">
              {step === 'generating' && '✨ Generating Notes...'}
              {step === 'review' && '📝 Review & Edit Notes'}
              {step === 'saving' && '💾 Saving...'}
              {step === 'complete' && '✅ Notes Saved!'}
            </h2>
            {step === 'review' && (
              <p className="text-sm text-verse-muted mt-1">Review the AI-generated notes and make any edits before saving</p>
            )}
          </div>
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
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 border-4 border-gold-500/30 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-transparent border-t-gold-500 rounded-full animate-spin"></div>
              </div>
              <p className="text-verse-text font-medium">AI is analyzing your sermon...</p>
              <p className="text-verse-muted text-sm mt-2">Extracting key points, themes, and applications</p>
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
                      <h4 className="font-semibold text-amber-400 mb-1">Review Suggested</h4>
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
                  className="w-full px-4 py-3 rounded-xl bg-verse-bg border border-verse-border text-verse-text text-lg font-medium focus:border-gold-500 focus:outline-none transition-colors"
                />
              </div>
              
              {/* Themes */}
              {themes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-verse-muted mb-2">
                    Themes
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {themes.map((theme, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-full bg-gold-500/10 text-gold-400 text-sm font-medium border border-gold-500/30">
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Summary */}
              <div>
                <label className="block text-sm font-medium text-verse-muted mb-2">
                  Summary
                  <span className="text-verse-subtle ml-2 font-normal">(edit if needed)</span>
                </label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 rounded-xl bg-verse-bg border border-verse-border text-verse-text focus:border-gold-500 focus:outline-none transition-colors resize-none leading-relaxed"
                />
              </div>
              
              {/* Key Points */}
              <div>
                <label className="block text-sm font-medium text-verse-muted mb-2">
                  Key Points ({keyPoints.length})
                  <span className="text-verse-subtle ml-2 font-normal">(click to edit)</span>
                </label>
                <div className="space-y-2">
                  {keyPoints.map((point, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="w-8 h-10 flex items-center justify-center text-gold-500 font-bold">
                        {index + 1}.
                      </span>
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
                  <div className="flex items-center gap-2 mt-3">
                    <span className="w-8"></span>
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
              
              {/* Application Points */}
              {applicationPoints.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-verse-muted mb-2">
                    Application Points
                  </label>
                  <div className="space-y-2">
                    {applicationPoints.map((point, i) => (
                      <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-verse-bg border border-verse-border">
                        <span className="text-gold-500">→</span>
                        <span className="text-verse-text italic">{point}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Scripture Preview */}
              {sessionData?.scriptures && sessionData.scriptures.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-verse-muted mb-2">
                    Scriptures Referenced ({sessionData.scriptures.length})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {sessionData.scriptures.map((s, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 rounded-lg bg-verse-bg border border-verse-border text-sm text-verse-text"
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
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 border-4 border-green-500/30 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-transparent border-t-green-500 rounded-full animate-spin"></div>
              </div>
              <p className="text-verse-text font-medium">Saving your notes...</p>
            </div>
          )}
          
          {/* Complete State */}
          {step === 'complete' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
                <Check className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-2xl font-display font-bold text-verse-text mb-2">Notes Saved!</h3>
              <p className="text-verse-muted text-center mb-8 max-w-md">
                Your sermon notes have been saved. Download them to share or archive.
              </p>
              
              {/* Summary Preview */}
              <div className="w-full max-w-lg p-5 rounded-xl bg-verse-bg border border-verse-border mb-6">
                <h4 className="font-semibold text-verse-text mb-2">{title}</h4>
                <p className="text-sm text-verse-muted line-clamp-3">{summary}</p>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-verse-border">
                  <span className="text-xs text-verse-subtle">{keyPoints.length} key points</span>
                  <span className="text-xs text-verse-subtle">{sessionData?.scriptures?.length || 0} scriptures</span>
                </div>
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
                {/* Download Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-verse-border text-verse-text hover:bg-verse-muted/20 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  {showDownloadMenu && (
                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-verse-surface border border-verse-border rounded-xl shadow-xl overflow-hidden z-10">
                      <button
                        onClick={handleDownloadPDF}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-verse-text hover:bg-verse-border transition-colors"
                      >
                        <FileText className="w-4 h-4 text-red-400" />
                        <div>
                          <div className="font-medium">PDF Document</div>
                          <div className="text-xs text-verse-muted">Best for printing</div>
                        </div>
                      </button>
                      <button
                        onClick={handleDownloadWord}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-verse-text hover:bg-verse-border transition-colors"
                      >
                        <FileDown className="w-4 h-4 text-blue-400" />
                        <div>
                          <div className="font-medium">Word Document</div>
                          <div className="text-xs text-verse-muted">Best for editing</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={handleSave}
                  disabled={!orgId}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-colors shadow-lg",
                    orgId 
                      ? "bg-gold-500 text-verse-bg hover:bg-gold-400 shadow-gold-500/20"
                      : "bg-verse-border text-verse-muted cursor-not-allowed"
                  )}
                >
                  <Save className="w-4 h-4" />
                  {orgId ? 'Save Notes' : 'Loading...'}
                </button>
              </div>
            </div>
          )}
          
          {step === 'complete' && (
            <div className="flex items-center justify-center gap-4">
              <div className="relative">
                <button
                  onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gold-500 text-verse-bg font-semibold hover:bg-gold-400 transition-colors shadow-lg shadow-gold-500/20"
                >
                  <Download className="w-4 h-4" />
                  Download Notes
                </button>
                {showDownloadMenu && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-verse-surface border border-verse-border rounded-xl shadow-xl overflow-hidden z-10">
                    <button
                      onClick={handleDownloadPDF}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-verse-text hover:bg-verse-border transition-colors"
                    >
                      <FileText className="w-4 h-4 text-red-400" />
                      <span>PDF Document</span>
                    </button>
                    <button
                      onClick={handleDownloadWord}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-verse-text hover:bg-verse-border transition-colors"
                    >
                      <FileDown className="w-4 h-4 text-blue-400" />
                      <span>Word Document</span>
                    </button>
                  </div>
                )}
              </div>
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
