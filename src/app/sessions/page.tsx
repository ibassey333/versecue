"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Calendar, Clock, FileText, Download, ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSessions, SessionData } from '@/lib/sessions';
import { generatePDF } from '@/lib/pdfGenerator';

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
  
  useEffect(() => {
    loadSessions();
  }, []);
  
  const loadSessions = async () => {
    setLoading(true);
    const data = await getSessions();
    setSessions(data);
    setLoading(false);
  };
  
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };
  
  return (
    <div className="min-h-screen bg-verse-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-verse-border bg-verse-bg/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 rounded-lg text-verse-muted hover:text-verse-text hover:bg-verse-border transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600">
                  <BookOpen className="w-5 h-5 text-verse-bg" />
                </div>
                <div>
                  <h1 className="font-display text-xl font-bold text-gold-400">VerseCue</h1>
                  <p className="text-[10px] text-verse-muted uppercase tracking-wider">Past Sessions</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 opacity-30">📚</div>
            <h2 className="text-xl font-semibold text-verse-text mb-2">No Sessions Yet</h2>
            <p className="text-verse-muted mb-6">Your saved sermon notes will appear here</p>
            <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gold-500 text-verse-bg font-semibold hover:bg-gold-400 transition-colors">
              <BookOpen className="w-5 h-5" />
              Start a Session
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sessions List */}
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-sm font-semibold text-verse-subtle uppercase tracking-wide">All Sessions</h2>
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className={cn(
                    'w-full text-left p-4 rounded-xl border transition-all',
                    selectedSession?.id === session.id
                      ? 'border-gold-500 bg-gold-500/10'
                      : 'border-verse-border bg-verse-surface hover:bg-verse-elevated'
                  )}
                >
                  <p className="font-medium text-verse-text mb-1">{formatDate(session.date)}</p>
                  <div className="flex items-center gap-4 text-xs text-verse-muted">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {session.duration_minutes} min
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {session.scriptures.length} scriptures
                    </span>
                  </div>
                </button>
              ))}
            </div>
            
            {/* Session Detail */}
            <div className="lg:col-span-2">
              {selectedSession ? (
                <div className="rounded-xl border border-verse-border bg-verse-surface p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6 pb-6 border-b border-verse-border">
                    <div>
                      <h2 className="font-display text-2xl font-bold text-verse-text mb-2">
                        {formatDate(selectedSession.date)}
                      </h2>
                      <div className="flex items-center gap-4 text-sm text-verse-muted">
                        <span>{formatTime(selectedSession.date)}</span>
                        <span>{selectedSession.duration_minutes} minutes</span>
                        <span>{selectedSession.scriptures.length} scriptures</span>
                      </div>
                    </div>
                    <button
                      onClick={() => generatePDF(selectedSession)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold-500 text-verse-bg font-medium hover:bg-gold-400 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      PDF
                    </button>
                  </div>
                  
                  {/* Summary */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-verse-text mb-3 flex items-center gap-2">
                      <span>📝</span> Summary
                    </h3>
                    <p className="text-verse-muted leading-relaxed">{selectedSession.summary}</p>
                  </div>
                  
                  {/* Key Points */}
                  {selectedSession.key_points.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-verse-text mb-3 flex items-center gap-2">
                        <span>🎯</span> Key Points
                      </h3>
                      <ul className="space-y-2">
                        {selectedSession.key_points.map((point, i) => (
                          <li key={i} className="flex items-start gap-3 text-verse-muted">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gold-500/20 text-gold-500 flex items-center justify-center text-xs font-semibold">
                              {i + 1}
                            </span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Scriptures */}
                  {selectedSession.scriptures.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-verse-text mb-3 flex items-center gap-2">
                        <span>📖</span> Scriptures
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {selectedSession.scriptures.map((s, i) => (
                          <div key={i} className="p-3 rounded-lg bg-verse-bg">
                            <p className="font-semibold text-gold-500 text-sm">{s.reference}</p>
                            {s.verse_text && (
                              <p className="text-xs text-verse-muted mt-1 line-clamp-2 italic">"{s.verse_text}"</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Transcript Preview */}
                  <div>
                    <h3 className="font-semibold text-verse-text mb-3 flex items-center gap-2">
                      <span>🎤</span> Transcript
                    </h3>
                    <p className="text-sm text-verse-muted line-clamp-6">{selectedSession.transcript}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-verse-border bg-verse-surface p-12 text-center">
                  <FileText className="w-12 h-12 text-verse-muted mx-auto mb-4" />
                  <p className="text-verse-muted">Select a session to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
