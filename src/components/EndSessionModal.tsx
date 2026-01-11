"use client";

import { useState } from 'react';
import { X, Save, FileText, Loader2, CheckCircle2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { saveSession, SessionData } from '@/lib/sessions';
import { generatePDF } from '@/lib/pdfGenerator';
import { useSessionStore } from '@/stores/session';

interface EndSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  startTime: Date;
}

export function EndSessionModal({ isOpen, onClose, startTime }: EndSessionModalProps) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [savedSession, setSavedSession] = useState<SessionData | null>(null);
  
  const transcript = useSessionStore((s) => s.transcript);
  const detectionHistory = useSessionStore((s) => s.detectionHistory);
  const newSession = useSessionStore((s) => s.newSession);
  
  if (!isOpen) return null;
  
  const handleSave = async () => {
    setStatus('saving');
    
    try {
      const session = await saveSession(transcript, detectionHistory, startTime);
      if (session) {
        setSavedSession(session);
        setStatus('saved');
      } else {
        setStatus('error');
      }
    } catch (err) {
      console.error('Save error:', err);
      setStatus('error');
    }
  };
  
  const handleDownloadPDF = () => {
    if (savedSession) {
      generatePDF(savedSession);
    }
  };
  
  const handleNewSession = () => {
    newSession();
    onClose();
    setStatus('idle');
    setSavedSession(null);
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-verse-surface border border-verse-border rounded-2xl w-full max-w-lg mx-4 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-verse-border">
          <h2 className="font-display text-xl font-semibold text-verse-text">End Session</h2>
          <button onClick={onClose} className="p-2 text-verse-muted hover:text-verse-text transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {status === 'idle' && (
            <>
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">📝</div>
                <p className="text-verse-text mb-2">Save this session?</p>
                <p className="text-sm text-verse-muted">
                  {transcript.length} segments • {detectionHistory.length} scriptures detected
                </p>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={handleSave}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gold-500 text-verse-bg font-semibold hover:bg-gold-400 transition-colors"
                >
                  <Save className="w-5 h-5" />
                  Save & Generate Notes
                </button>
                
                <button
                  onClick={handleNewSession}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-verse-border text-verse-muted font-medium hover:bg-verse-elevated hover:text-verse-text transition-colors"
                >
                  Discard & Start New
                </button>
              </div>
            </>
          )}
          
          {status === 'saving' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-gold-500 animate-spin mx-auto mb-4" />
              <p className="text-verse-text font-medium">Generating sermon notes...</p>
              <p className="text-sm text-verse-muted mt-2">AI is summarizing your transcript</p>
            </div>
          )}
          
          {status === 'saved' && savedSession && (
            <>
              <div className="text-center mb-6">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-verse-text font-semibold text-lg mb-2">Notes Generated!</p>
              </div>
              
              {/* Preview */}
              <div className="bg-verse-bg rounded-xl p-4 mb-6 max-h-60 overflow-y-auto">
                <h4 className="font-semibold text-verse-text mb-2">Summary</h4>
                <p className="text-sm text-verse-muted mb-4">{savedSession.summary.substring(0, 200)}...</p>
                
                {savedSession.key_points.length > 0 && (
                  <>
                    <h4 className="font-semibold text-verse-text mb-2">Key Points</h4>
                    <ul className="text-sm text-verse-muted space-y-1">
                      {savedSession.key_points.slice(0, 3).map((point, i) => (
                        <li key={i}>• {point}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={handleDownloadPDF}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gold-500 text-verse-bg font-semibold hover:bg-gold-400 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Download PDF
                </button>
                
                <button
                  onClick={handleNewSession}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-verse-border text-verse-muted font-medium hover:bg-verse-elevated hover:text-verse-text transition-colors"
                >
                  Start New Session
                </button>
              </div>
            </>
          )}
          
          {status === 'error' && (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">❌</div>
              <p className="text-verse-text font-medium">Something went wrong</p>
              <p className="text-sm text-verse-muted mt-2 mb-6">Unable to save session</p>
              <button
                onClick={() => setStatus('idle')}
                className="px-6 py-3 rounded-xl bg-verse-border text-verse-text font-medium hover:bg-verse-elevated transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
