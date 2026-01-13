"use client";

import Link from 'next/link';
import { Settings } from 'lucide-react';

export function DisplaySettingsLink({ orgSlug }: { orgSlug?: string }) {
  if (!orgSlug) return null;
  
  return (
    <Link
      href={`/${orgSlug}/display`}
      className="flex items-center gap-2 px-3 py-2 text-sm text-verse-muted hover:text-verse-text hover:bg-verse-surface rounded-lg transition-colors"
    >
      <Settings className="w-4 h-4" />
      Display Settings
    </Link>
  );
}
