"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useOrg } from '@/contexts/OrgContext';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { 
  ArrowLeft, 
  Loader2, 
  Save, 
  Check, 
  Clock,
  History,
  Download,
  FileText,
  AlertCircle
} from 'lucide-react';
import { SessionEditor } from '@/components/SessionEditor';
import { VersionHistorySidebar } from '@/components/VersionHistorySidebar';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import { cn } from '@/lib/utils';

interface Session {
  id: string;
  title: string;
  date: string;
  duration_minutes: number;
  summary: string;
  scriptures: any[];
  key_points: string[];
  transcript: string;
  version: number;
  status: 'draft' | 'published';
  organization_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  last_edited_at: string | null;
}

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

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function SessionEditorPage({ 
  params 
}: { 
  params: { orgSlug: string; id: string } 
}) {
  const router = useRouter();
  const { org, loading: orgLoading } = useOrg();
  const { user } = useAuth();
  const supabase = createClient();

  const [session, setSession] = useState<Session | null>(null);
  const [versions, setVersions] = useState<SessionVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [hasChanges, setHasChanges] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    if (org?.id && params.id) {
      loadSession();
      loadVersions();
    }
  }, [org?.id, params.id]);

  const loadSession = async () => {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', params.id)
      .eq('organization_id', org!.id)
      .single();

    if (error) {
      console.error('[SessionEditor] Load error:', error);
      setLoading(false);
      return;
    }

    setSession({
      ...data,
      scriptures: typeof data.scriptures === 'string' ? JSON.parse(data.scriptures) : data.scriptures || [],
      key_points: typeof data.key_points === 'string' ? JSON.parse(data.key_points) : data.key_points || [],
      version: data.version || 1,
      status: data.status || 'draft',
    });
    setLoading(false);
  };

  const loadVersions = async () => {
    const { data, error } = await supabase
      .from('session_versions')
      .select('*')
      .eq('session_id', params.id)
      .order('version_number', { ascending: false });

    if (!error && data) {
      setVersions(data.map(v => ({
        ...v,
        key_points: typeof v.key_points === 'string' ? JSON.parse(v.key_points) : v.key_points || [],
        scriptures: typeof v.scriptures === 'string' ? JSON.parse(v.scriptures) : v.scriptures || [],
      })));
    }
  };

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!hasChanges || !session) return;

    const timer = setTimeout(() => {
      handleAutoSave();
    }, 30000);

    return () => clearTimeout(timer);
  }, [hasChanges, session]);

  const handleAutoSave = async () => {
    if (!session || !hasChanges) return;
    
    setSaveStatus('saving');
    
    const { error } = await supabase
      .from('sessions')
      .update({
        title: session.title,
        summary: session.summary,
        key_points: JSON.stringify(session.key_points),
        scriptures: JSON.stringify(session.scriptures),
        updated_at: new Date().toISOString(),
        last_edited_by: user?.id,
        last_edited_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    if (error) {
      console.error('[SessionEditor] Auto-save error:', error);
      setSaveStatus('error');
    } else {
      setSaveStatus('saved');
      setHasChanges(false);
      setLastSaved(new Date());
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  // Create new version (manual save)
  const handleCreateVersion = async (changeNote?: string) => {
    if (!session) return;
    
    setSaveStatus('saving');

    // Save current state to versions table
    const { error: versionError } = await supabase
      .from('session_versions')
      .insert({
        session_id: session.id,
        version_number: session.version,
        title: session.title,
        summary: session.summary,
        key_points: JSON.stringify(session.key_points),
        scriptures: JSON.stringify(session.scriptures),
        edited_by: user?.id,
        editor_name: user?.user_metadata?.full_name || user?.email,
        change_note: changeNote || 'Manual save',
      });

    if (versionError) {
      console.error('[SessionEditor] Version save error:', versionError);
      setSaveStatus('error');
      return;
    }

    // Update session with incremented version
    const newVersion = session.version + 1;
    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        title: session.title,
        summary: session.summary,
        key_points: JSON.stringify(session.key_points),
        scriptures: JSON.stringify(session.scriptures),
        version: newVersion,
        updated_at: new Date().toISOString(),
        last_edited_by: user?.id,
        last_edited_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    if (updateError) {
      console.error('[SessionEditor] Update error:', updateError);
      setSaveStatus('error');
      return;
    }

    setSession(prev => prev ? { ...prev, version: newVersion } : null);
    setHasChanges(false);
    setLastSaved(new Date());
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);

    loadVersions();
  };

  // FIXED: Restore version - now properly saves restored content
  const handleRestoreVersion = async (version: SessionVersion) => {
    if (!session) return;
    
    setSaveStatus('saving');

    // 1. Save current state as backup
    await supabase.from('session_versions').insert({
      session_id: session.id,
      version_number: session.version,
      title: session.title,
      summary: session.summary,
      key_points: JSON.stringify(session.key_points),
      scriptures: JSON.stringify(session.scriptures),
      edited_by: user?.id,
      editor_name: user?.user_metadata?.full_name || user?.email,
      change_note: `Backup before restore to v${version.version_number}`,
    });

    // 2. Save the restored content to database
    const newVersion = session.version + 1;
    const { error } = await supabase
      .from('sessions')
      .update({
        title: version.title,
        summary: version.summary || '',
        key_points: JSON.stringify(version.key_points),
        scriptures: JSON.stringify(version.scriptures),
        version: newVersion,
        updated_at: new Date().toISOString(),
        last_edited_by: user?.id,
        last_edited_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    if (error) {
      console.error('[SessionEditor] Restore error:', error);
      setSaveStatus('error');
      return;
    }

    // 3. Update local state with restored content
    setSession(prev => prev ? {
      ...prev,
      title: version.title,
      summary: version.summary || '',
      key_points: version.key_points,
      scriptures: version.scriptures,
      version: newVersion,
    } : null);
    
    setHasChanges(false);
    setLastSaved(new Date());
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
    setShowHistory(false);
    
    loadVersions();
  };

  const handleSessionChange = useCallback((updates: Partial<Session>) => {
    setSession(prev => prev ? { ...prev, ...updates } : null);
    setHasChanges(true);
    setSaveStatus('idle');
  }, []);

  // FIXED: PDF Download using jsPDF
  const handleDownloadPDF = () => {
    console.log('[Download] PDF clicked', session?.title);
    if (!session) {
      console.log('[Download] No session');
      return;
    }
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = 20;

      // Title
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 54, 93); // Navy
      const titleLines = doc.splitTextToSize(session.title, contentWidth);
      doc.text(titleLines, pageWidth / 2, yPos, { align: 'center' });
      yPos += titleLines.length * 10 + 10;

      // Gold line
      doc.setDrawColor(198, 169, 98);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 15;

      // Date & Duration
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      const dateStr = new Date(session.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      doc.text(`${dateStr} • ${session.duration_minutes} minutes`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 20;

      // Summary
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 54, 93);
      doc.text('Summary', margin, yPos);
      yPos += 8;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(45, 55, 72);
      const summaryLines = doc.splitTextToSize(session.summary, contentWidth);
      doc.text(summaryLines, margin, yPos);
      yPos += summaryLines.length * 6 + 15;

      // Check for page break
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      // Key Points
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 54, 93);
      doc.text('Key Points', margin, yPos);
      yPos += 10;

      session.key_points.forEach((point, i) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(198, 169, 98);
        doc.text(`${i + 1}.`, margin, yPos);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(45, 55, 72);
        const pointLines = doc.splitTextToSize(point, contentWidth - 10);
        doc.text(pointLines, margin + 10, yPos);
        yPos += pointLines.length * 6 + 8;
      });

      // Scriptures
      if (session.scriptures.length > 0) {
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }
        
        yPos += 10;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 54, 93);
        doc.text('Scripture References', margin, yPos);
        yPos += 10;

        session.scriptures.forEach((scripture) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(198, 169, 98);
          doc.text(scripture.reference, margin, yPos);
          yPos += 6;
          
          if (scripture.verse_text) {
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(100, 100, 100);
            const verseLines = doc.splitTextToSize(`"${scripture.verse_text}"`, contentWidth);
            doc.text(verseLines, margin, yPos);
            yPos += verseLines.length * 5 + 8;
          }
        });
      }

      // Footer
      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Generated by VerseCue', pageWidth / 2, 290, { align: 'center' });
      }

      doc.save(`${session.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    } catch (error) {
      console.error('[PDF] Download error:', error);
      alert('Failed to generate PDF. Please try again.');
    }
    
    setShowDownloadMenu(false);
  };

  // FIXED: Word Download
  const handleDownloadWord = async () => {
    console.log('[Download] Word clicked', session?.title);
    if (!session) {
      console.log('[Download] No session');
      return;
    }
    
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: session.title, bold: true, size: 56, color: "1a365d" }),
              ],
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({ 
                  text: new Date(session.date).toLocaleDateString('en-US', { 
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                  }), 
                  size: 22, 
                  color: "666666" 
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Summary", bold: true, size: 32, color: "1a365d" }),
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 300, after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: session.summary, size: 24, color: "2d3748" }),
              ],
              spacing: { after: 400, line: 360 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Key Points", bold: true, size: 32, color: "1a365d" }),
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 300, after: 200 },
            }),
            ...session.key_points.map((point, i) =>
              new Paragraph({
                children: [
                  new TextRun({ text: `${i + 1}. `, bold: true, size: 24, color: "c6a962" }),
                  new TextRun({ text: point, size: 24, color: "2d3748" }),
                ],
                spacing: { after: 150 },
              })
            ),
            ...(session.scriptures.length > 0 ? [
              new Paragraph({
                children: [
                  new TextRun({ text: "Scripture References", bold: true, size: 32, color: "1a365d" }),
                ],
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
              }),
              ...session.scriptures.flatMap((scripture) => [
                new Paragraph({
                  children: [
                    new TextRun({ text: scripture.reference, bold: true, size: 24, color: "c6a962" }),
                  ],
                  spacing: { after: 100 },
                }),
                ...(scripture.verse_text ? [
                  new Paragraph({
                    children: [
                      new TextRun({ text: `"${scripture.verse_text}"`, italics: true, size: 22, color: "666666" }),
                    ],
                    spacing: { after: 200 },
                  }),
                ] : []),
              ]),
            ] : []),
          ],
        }],
      });
      
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${session.title.replace(/[^a-z0-9]/gi, '_')}.docx`);
    } catch (error) {
      console.error('[Word] Download error:', error);
      alert('Failed to generate Word document. Please try again.');
    }
    
    setShowDownloadMenu(false);
  };

  if (orgLoading || loading) {
    return (
      <div className="min-h-screen bg-verse-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-verse-bg flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-verse-text mb-2">Session not found</h1>
          <button
            onClick={() => router.push(`/${params.orgSlug}/sessions`)}
            className="text-gold-400 hover:text-gold-300"
          >
            Back to Sessions
          </button>
        </div>
      </div>
    );
  }

  const formatLastSaved = () => {
    if (!lastSaved) return null;
    const diff = Date.now() - lastSaved.getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return lastSaved.toLocaleTimeString();
  };

  return (
    <div className="min-h-screen bg-verse-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-verse-surface/95 backdrop-blur-sm border-b border-verse-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <button
                onClick={() => router.push(`/${params.orgSlug}/sessions`)}
                className="p-2 rounded-lg text-verse-muted hover:text-verse-text hover:bg-verse-border transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-verse-text truncate">
                  {session.title}
                </h1>
                <div className="flex items-center gap-3 text-sm text-verse-muted">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium",
                    session.status === 'published' 
                      ? "bg-green-500/10 text-green-400"
                      : "bg-amber-500/10 text-amber-400"
                  )}>
                    {session.status === 'published' ? 'Published' : 'Draft'}
                  </span>
                  <span>v{session.version}</span>
                  {lastSaved && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Saved {formatLastSaved()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-sm mr-2">
                {saveStatus === 'saving' && (
                  <span className="flex items-center gap-1 text-verse-muted">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="flex items-center gap-1 text-green-400">
                    <Check className="w-4 h-4" />
                    Saved
                  </span>
                )}
                {saveStatus === 'error' && (
                  <span className="flex items-center gap-1 text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    Error
                  </span>
                )}
                {hasChanges && saveStatus === 'idle' && (
                  <span className="text-amber-400">Unsaved changes</span>
                )}
              </div>

              <button
                onClick={() => setShowHistory(!showHistory)}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  showHistory 
                    ? "bg-gold-500/10 text-gold-400" 
                    : "text-verse-muted hover:text-verse-text hover:bg-verse-border"
                )}
              >
                <History className="w-5 h-5" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                  className="p-2 rounded-lg text-verse-muted hover:text-verse-text hover:bg-verse-border transition-colors"
                >
                  <Download className="w-5 h-5" />
                </button>
                {showDownloadMenu && (
                  <>
                    {/* Backdrop to close menu */}
                    <div 
                      className="fixed inset-0 z-[60]" 
                      onClick={() => setShowDownloadMenu(false)}
                    />
                    {/* Dropdown menu */}
                    <div className="absolute right-0 top-full mt-2 w-48 bg-verse-surface border border-verse-border rounded-xl shadow-xl overflow-hidden z-[70]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('[Download] PDF clicked');
                          handleDownloadPDF();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-verse-text hover:bg-verse-border transition-colors cursor-pointer"
                      >
                        <FileText className="w-4 h-4 text-red-400" />
                        <div>
                          <div className="font-medium">PDF</div>
                          <div className="text-xs text-verse-muted">Best for printing</div>
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('[Download] Word clicked');
                          handleDownloadWord();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-verse-text hover:bg-verse-border transition-colors cursor-pointer"
                      >
                        <FileText className="w-4 h-4 text-blue-400" />
                        <div>
                          <div className="font-medium">Word</div>
                          <div className="text-xs text-verse-muted">Best for editing</div>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => handleCreateVersion()}
                disabled={!hasChanges || saveStatus === 'saving'}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-colors",
                  hasChanges && saveStatus !== 'saving'
                    ? "bg-gold-500 text-verse-bg hover:bg-gold-400"
                    : "bg-verse-border text-verse-muted cursor-not-allowed"
                )}
              >
                <Save className="w-4 h-4" />
                Save Version
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <main className={cn(
          "flex-1 transition-all duration-300",
          showHistory ? "mr-80" : ""
        )}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
            <SessionEditor
              session={session}
              onChange={handleSessionChange}
            />
          </div>
        </main>

        <VersionHistorySidebar
          isOpen={showHistory}
          versions={versions}
          currentVersion={session.version}
          onRestore={handleRestoreVersion}
          onClose={() => setShowHistory(false)}
        />
      </div>

    </div>
  );
}
