"use client";
import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './AuthContext';

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'church';
  logo_url: string | null;
  owner_id: string;
}

interface OrgContextType {
  org: Organization | null;
  loading: boolean;
  isOwner: boolean;
  refreshOrg: () => Promise<void>;
}

const OrgContext = createContext<OrgContextType>({
  org: null,
  loading: true,
  isOwner: false,
  refreshOrg: async () => {},
});

export function OrgProvider({ 
  children,
  slug 
}: { 
  children: React.ReactNode;
  slug: string;
}) {
  const { user, loading: authLoading } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();
  
  const loadOrg = async () => {
    if (!slug) {
      setLoading(false);
      return;
    }
    
    console.log('[OrgContext] Loading org:', slug, 'User:', user?.id);
    
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single();
    
    console.log('[OrgContext] Result:', data, error);
    
    if (!error && data) {
      setOrg(data);
    } else {
      setOrg(null);
    }
    
    setLoading(false);
  };
  
  // IMPORTANT: Wait for auth to be ready before loading org
  // RLS policies require auth.uid() to be set
  useEffect(() => {
    if (authLoading) {
      console.log('[OrgContext] Waiting for auth...');
      return;
    }
    
    if (!user) {
      console.log('[OrgContext] No user, skipping org load');
      setLoading(false);
      return;
    }
    
    console.log('[OrgContext] Auth ready, loading org');
    loadOrg();
  }, [slug, user, authLoading]);
  
  const isOwner = org?.owner_id === user?.id;
  
  return (
    <OrgContext.Provider value={{ org, loading, isOwner, refreshOrg: loadOrg }}>
      {children}
    </OrgContext.Provider>
  );
}

export const useOrg = () => useContext(OrgContext);
