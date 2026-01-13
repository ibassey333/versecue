"use client";

import Link from 'next/link';
import { useOrg } from '@/contexts/OrgContext';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Settings, Users, History, CreditCard, LogOut, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function OrgHeader() {
  const { org } = useOrg();
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!org) return null;

  return (
    <header className="sticky top-0 z-50 bg-verse-bg/95 backdrop-blur border-b border-verse-border">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo & Org Name */}
        <Link href={`/${org.slug}`} className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600">
            <BookOpen className="w-5 h-5 text-verse-bg" />
          </div>
          <div>
            <span className="font-display text-lg font-bold text-gold-400">VerseCue</span>
            <span className="text-verse-muted text-sm ml-2">· {org.name}</span>
          </div>
        </Link>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            href={`/${org.slug}`}
            className="px-3 py-2 text-sm text-verse-muted hover:text-verse-text rounded-lg hover:bg-verse-surface transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href={`/${org.slug}/display`}
            className="px-3 py-2 text-sm text-verse-muted hover:text-verse-text rounded-lg hover:bg-verse-surface transition-colors flex items-center gap-1"
          >
            <Settings className="w-4 h-4" />
            Display
          </Link>
          <Link
            href={`/${org.slug}/sessions`}
            className="px-3 py-2 text-sm text-verse-muted hover:text-verse-text rounded-lg hover:bg-verse-surface transition-colors flex items-center gap-1"
          >
            <History className="w-4 h-4" />
            Sessions
          </Link>
        </nav>

        {/* User Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-verse-muted hover:text-verse-text rounded-lg hover:bg-verse-surface transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-400 font-semibold text-xs">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <ChevronDown className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-verse-surface border border-verse-border rounded-xl shadow-xl py-1 z-50">
              <div className="px-4 py-2 border-b border-verse-border">
                <p className="text-sm text-verse-text truncate">{user?.email}</p>
                <p className="text-xs text-verse-muted capitalize">{org.plan} plan</p>
              </div>
              <Link
                href={`/${org.slug}/team`}
                className="flex items-center gap-2 px-4 py-2 text-sm text-verse-muted hover:text-verse-text hover:bg-verse-border transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                <Users className="w-4 h-4" />
                Team
              </Link>
              <Link
                href={`/${org.slug}/billing`}
                className="flex items-center gap-2 px-4 py-2 text-sm text-verse-muted hover:text-verse-text hover:bg-verse-border transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                <CreditCard className="w-4 h-4" />
                Billing
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 text-sm text-verse-muted hover:text-verse-text hover:bg-verse-border transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                Switch Church
              </Link>
              <button
                onClick={() => { setMenuOpen(false); signOut(); }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-verse-border transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
