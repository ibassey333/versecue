"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useOrg } from '@/contexts/OrgContext';
import { useAuth } from '@/contexts/AuthContext';
import { 
  BookOpen, 
  Settings, 
  History, 
  Users, 
  CreditCard, 
  LogOut, 
  ChevronDown,
  Menu,
  X,
  LayoutDashboard,
  Monitor,
  ExternalLink
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function OrgHeader() {
  const { org } = useOrg();
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (!org) return null;

  const navItems = [
    { href: `/${org.slug}`, label: 'Dashboard', icon: LayoutDashboard },
    { href: `/${org.slug}/display`, label: 'Display', icon: Settings },
    { href: `/${org.slug}/sessions`, label: 'Sessions', icon: History },
  ];

  const isActive = (href: string) => {
    if (href === `/${org.slug}`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 bg-verse-bg border-b border-verse-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Org */}
          <div className="flex items-center gap-6">
            <Link href={`/${org.slug}`} className="flex items-center gap-3 group">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 shadow-lg shadow-gold-500/20 group-hover:shadow-gold-500/40 transition-shadow">
                <BookOpen className="w-5 h-5 text-verse-bg" />
              </div>
              <div className="hidden sm:block">
                <span className="font-display text-lg font-bold text-gold-400">VerseCue</span>
              </div>
            </Link>

            {/* Org Selector */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-verse-surface rounded-lg border border-verse-border">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm text-verse-text font-medium truncate max-w-[150px]">{org.name}</span>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-gold-500/10 text-gold-400'
                      : 'text-verse-muted hover:text-verse-text hover:bg-verse-surface'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}

            {/* Open Display Link */}
            <a
              href={`/display/${org.slug}`}
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-2 ml-2 text-sm text-verse-muted hover:text-gold-400 transition-colors"
            >
              <Monitor className="w-4 h-4" />
              <span className="hidden lg:inline">Preview</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* User Menu (Desktop) */}
            <div className="relative hidden md:block" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl bg-verse-surface border border-verse-border hover:border-verse-muted transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-verse-bg font-semibold text-xs">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                <ChevronDown className={`w-4 h-4 text-verse-muted transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-verse-surface border border-verse-border rounded-xl shadow-xl overflow-hidden z-50">
                  {/* User Info */}
                  <div className="px-4 py-3 bg-verse-elevated border-b border-verse-border">
                    <p className="text-sm font-medium text-verse-text truncate">{user?.email}</p>
                    <p className="text-xs text-verse-muted mt-0.5 capitalize flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        org.plan === 'free' ? 'bg-gray-400' : 
                        org.plan === 'pro' ? 'bg-blue-400' : 'bg-gold-400'
                      }`}></span>
                      {org.plan} plan
                    </p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <Link
                      href={`/${org.slug}/team`}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-verse-muted hover:text-verse-text hover:bg-verse-border transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Users className="w-4 h-4" />
                      Team Members
                    </Link>
                    <Link
                      href={`/${org.slug}/billing`}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-verse-muted hover:text-verse-text hover:bg-verse-border transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      <CreditCard className="w-4 h-4" />
                      Billing & Plan
                    </Link>
                  </div>

                  <div className="border-t border-verse-border py-1">
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-verse-muted hover:text-verse-text hover:bg-verse-border transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      <BookOpen className="w-4 h-4" />
                      Switch Church
                    </Link>
                  </div>

                  <div className="border-t border-verse-border py-1">
                    <button
                      onClick={() => { setMenuOpen(false); signOut(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-verse-muted hover:text-verse-text rounded-lg hover:bg-verse-surface transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-verse-border bg-verse-bg">
          <div className="px-4 py-3 border-b border-verse-border bg-verse-surface">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium text-verse-text">{org.name}</span>
              <span className="text-xs text-verse-muted capitalize ml-auto">{org.plan}</span>
            </div>
          </div>

          <nav className="px-2 py-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-gold-500/10 text-gold-400'
                      : 'text-verse-muted hover:text-verse-text hover:bg-verse-surface'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}

            <a
              href={`/display/${org.slug}`}
              target="_blank"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-verse-muted hover:text-verse-text hover:bg-verse-surface transition-all"
            >
              <Monitor className="w-5 h-5" />
              Open Display
              <ExternalLink className="w-4 h-4 ml-auto" />
            </a>
          </nav>

          <div className="px-2 py-3 border-t border-verse-border space-y-1">
            <Link
              href={`/${org.slug}/team`}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-verse-muted hover:text-verse-text hover:bg-verse-surface transition-colors"
            >
              <Users className="w-5 h-5" />
              Team Members
            </Link>
            <Link
              href={`/${org.slug}/billing`}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-verse-muted hover:text-verse-text hover:bg-verse-surface transition-colors"
            >
              <CreditCard className="w-5 h-5" />
              Billing & Plan
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-verse-muted hover:text-verse-text hover:bg-verse-surface transition-colors"
            >
              <BookOpen className="w-5 h-5" />
              Switch Church
            </Link>
          </div>

          <div className="px-2 py-3 border-t border-verse-border">
            <div className="px-4 py-2 mb-2">
              <p className="text-sm text-verse-text truncate">{user?.email}</p>
            </div>
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
