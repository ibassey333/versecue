"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { BookOpen, Plus, Building2, Loader2, LogOut, ChevronRight } from 'lucide-react';
import { CreateOrgModal } from '@/components/modals/CreateOrgModal';

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: string;
}

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    loadOrganizations();
  }, [user, authLoading]);

  const loadOrganizations = async () => {
    setLoading(true);
    
    const { data: memberships, error } = await supabase
      .from('organization_members')
      .select(`
        role,
        organizations (
          id,
          name,
          slug,
          plan
        )
      `)
      .eq('user_id', user?.id);

    if (!error && memberships) {
      const organizations = memberships.map((m: any) => ({
        ...m.organizations,
        role: m.role,
      }));
      setOrgs(organizations);
      
      // Auto-redirect if only one org
      if (organizations.length === 1) {
        router.push(`/${organizations[0].slug}`);
        return;
      }
    }
    
    setLoading(false);
  };

  const handleOrgCreated = (slug: string) => {
    setShowCreateModal(false);
    router.push(`/${slug}`);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-verse-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-verse-bg">
      {/* Header */}
      <header className="border-b border-verse-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600">
              <BookOpen className="w-5 h-5 text-verse-bg" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-gold-400">VerseCue</h1>
              <p className="text-xs text-verse-muted">Choose your church</p>
            </div>
          </div>
          
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-4 py-2 text-verse-muted hover:text-verse-text transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-verse-text mb-2">Your Churches</h2>
          <p className="text-verse-muted">Select a church to open the dashboard, or create a new one.</p>
        </div>

        {orgs.length === 0 ? (
          <div className="bg-verse-surface border border-verse-border rounded-2xl p-12 text-center">
            <Building2 className="w-16 h-16 text-verse-muted mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-verse-text mb-2">No churches yet</h3>
            <p className="text-verse-muted mb-6">Create your first church to get started with VerseCue.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gold-500 text-verse-bg font-semibold rounded-xl hover:bg-gold-400 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Church
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orgs.map((org) => (
              <button
                key={org.id}
                onClick={() => router.push(`/${org.slug}`)}
                className="w-full flex items-center justify-between p-6 bg-verse-surface border border-verse-border rounded-2xl hover:bg-verse-elevated hover:border-gold-500/50 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gold-500/10 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-gold-500" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-verse-text group-hover:text-gold-400 transition-colors">
                      {org.name}
                    </h3>
                    <p className="text-sm text-verse-muted">
                      {org.role === 'owner' ? 'Owner' : 'Member'} · {org.plan.charAt(0).toUpperCase() + org.plan.slice(1)} plan
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-verse-muted group-hover:text-gold-400 transition-colors" />
              </button>
            ))}

            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full flex items-center justify-center gap-2 p-6 border-2 border-dashed border-verse-border rounded-2xl text-verse-muted hover:text-verse-text hover:border-verse-muted transition-all"
            >
              <Plus className="w-5 h-5" />
              Add another church
            </button>
          </div>
        )}
      </main>

      {/* Create Org Modal */}
      <CreateOrgModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleOrgCreated}
      />
    </div>
  );
}
