"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrg } from '@/contexts/OrgContext';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import Dashboard from '@/components/Dashboard';

export default function OrgDashboardPage() {
  const { org, loading: orgLoading } = useOrg();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading]);

  if (authLoading || orgLoading) {
    return (
      <div className="min-h-screen bg-verse-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-verse-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-verse-text mb-2">Church not found</h1>
          <p className="text-verse-muted mb-4">This church doesn\'t exist or you don\'t have access.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-gold-500 text-verse-bg font-semibold rounded-xl hover:bg-gold-400 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Pass org slug to Dashboard
  return <Dashboard orgSlug={org.slug} />;
}
