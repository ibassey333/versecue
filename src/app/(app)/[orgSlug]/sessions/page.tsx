"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrg } from '@/contexts/OrgContext';
import { createClient } from '@/lib/supabase/client';
import { History, Loader2, Clock, BookOpen, Trash2, ChevronRight } from 'lucide-react';

interface Session {
  id: string;
  title: string;
  date: string;
  duration_minutes: number;
  summary: string;
  scriptures: any[];
  key_points: string[];
  version: number;
  status: string;
  created_at: string;
}

export default function SessionsPage({ params }: { params: { orgSlug: string } }) {
  const router = useRouter();
  const { org, loading: orgLoading } = useOrg();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  const supabase = createClient();

  useEffect(() => {
    if (org?.id) {
      loadSessions();
    }
  }, [org?.id]);

  const loadSessions = async () => {
    if (!org?.id) return;
    
    setLoading(true);
    
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      const parsed = data.map((s: any) => ({
        ...s,
        scriptures: typeof s.scriptures === 'string' ? JSON.parse(s.scriptures) : s.scriptures || [],
        key_points: typeof s.key_points === 'string' ? JSON.parse(s.key_points) : s.key_points || [],
      }));
      setSessions(parsed);
    }
    
    setLoading(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Delete this session? This cannot be undone.')) return;
    
    setDeleting(id);
    
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id);
    
    if (!error) {
      setSessions(sessions.filter(s => s.id !== id));
    }
    
    setDeleting(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (orgLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-verse-surface border border-verse-border flex items-center justify-center mx-auto mb-4">
            <History className="w-8 h-8 text-verse-muted" />
          </div>
          <h1 className="text-2xl font-bold text-verse-text mb-2">No Sessions Yet</h1>
          <p className="text-verse-muted">Your saved sermon sessions will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-verse-text">Session History</h1>
          <p className="text-verse-muted mt-1">{sessions.length} saved session{sessions.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="space-y-3">
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => router.push(`/${params.orgSlug}/sessions/${session.id}`)}
            className="group bg-verse-surface border border-verse-border rounded-xl p-5 hover:border-gold-500/50 hover:shadow-lg hover:shadow-gold-500/5 transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-verse-text truncate">
                    {session.title}
                  </h3>
                  <span className="px-1.5 py-0.5 bg-verse-border rounded text-xs text-verse-muted">
                    v{session.version || 1}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-verse-muted">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDate(session.date)}
                  </span>
                  <span>{session.duration_minutes} min</span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    {session.scriptures?.length || 0} scriptures
                  </span>
                </div>

                {session.summary && (
                  <p className="mt-3 text-sm text-verse-muted line-clamp-2">
                    {session.summary}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleDelete(e, session.id)}
                  disabled={deleting === session.id}
                  className="p-2 rounded-lg text-verse-muted opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  {deleting === session.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                </button>
                <ChevronRight className="w-5 h-5 text-verse-muted group-hover:text-gold-400 transition-colors" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
