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
  const { user } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();

  const loadOrg = async () => {
    if (!slug) return;
    
    setLoading(true);
    
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single();

    if (!error && data) {
      setOrg(data);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadOrg();
  }, [slug]);

  const isOwner = org?.owner_id === user?.id;

  return (
    <OrgContext.Provider value={{ org, loading, isOwner, refreshOrg: loadOrg }}>
      {children}
    </OrgContext.Provider>
  );
}

export const useOrg = () => useContext(OrgContext);
