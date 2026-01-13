"use client";

import { useOrg } from '@/contexts/OrgContext';
import { Users, Loader2 } from 'lucide-react';

export default function TeamPage() {
  const { org, loading } = useOrg();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-verse-surface border border-verse-border flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-verse-muted" />
        </div>
        <h1 className="text-2xl font-bold text-verse-text mb-2">Team Members</h1>
        <p className="text-verse-muted mb-6">Invite and manage your church team.</p>
        <p className="text-sm text-verse-muted">Coming soon in the next update.</p>
      </div>
    </div>
  );
}
