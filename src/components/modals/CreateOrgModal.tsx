"use client";

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Building2, Loader2 } from 'lucide-react';

interface CreateOrgModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (slug: string) => void;
}

export function CreateOrgModal({ isOpen, onClose, onCreated }: CreateOrgModalProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const supabase = createClient();

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Call the RPC function to create organization
    const { data, error: rpcError } = await supabase.rpc('create_organization', {
      org_name: name,
    });

    if (rpcError) {
      console.error('Create org error:', rpcError);
      setError(rpcError.message || 'Failed to create organization');
      setLoading(false);
      return;
    }

    if (data) {
      onCreated(data.slug);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Generate preview slug
  const previewSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-verse-surface border border-verse-border rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-verse-border">
          <h2 className="font-display text-xl font-semibold text-verse-text">Create Church</h2>
          <button 
            onClick={onClose} 
            className="p-2 text-verse-muted hover:text-verse-text transition-colors rounded-lg hover:bg-verse-border"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <form onSubmit={handleCreate} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm text-verse-muted mb-2">Church Name</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-verse-muted" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-verse-bg border border-verse-border rounded-xl text-verse-text placeholder:text-verse-muted focus:outline-none focus:border-gold-500"
                placeholder="Grace Community Church"
                required
              />
            </div>
            {previewSlug && (
              <p className="text-xs text-verse-muted mt-2">
                Your display URL: <span className="text-gold-400">versecue.app/display/{previewSlug}</span>
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-verse-border text-verse-muted rounded-xl hover:bg-verse-border transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gold-500 text-verse-bg font-semibold rounded-xl hover:bg-gold-400 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
