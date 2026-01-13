"use client";

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { BookOpen, Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback?type=recovery`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-green-600">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="font-display text-2xl font-bold text-verse-text">Check your email</h1>
          <p className="text-verse-muted mt-2">
            We've sent password reset instructions to <strong className="text-verse-text">{email}</strong>
          </p>
        </div>
        
        <div className="text-center">
          <Link href="/login" className="inline-flex items-center gap-2 text-gold-400 hover:text-gold-300 font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Logo */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600">
            <BookOpen className="w-6 h-6 text-verse-bg" />
          </div>
        </div>
        <h1 className="font-display text-2xl font-bold text-gold-400">Reset Password</h1>
        <p className="text-sm text-verse-muted mt-1">We'll send you a reset link</p>
      </div>

      {/* Form */}
      <div className="bg-verse-surface border border-verse-border rounded-2xl p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-sm text-verse-muted mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-verse-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-verse-bg border border-verse-border rounded-xl text-verse-text placeholder:text-verse-muted focus:outline-none focus:border-gold-500"
                placeholder="you@church.org"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gold-500 text-verse-bg font-semibold rounded-xl hover:bg-gold-400 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
          </button>
        </form>
      </div>

      {/* Back link */}
      <p className="text-center">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-verse-muted hover:text-verse-text">
          <ArrowLeft className="w-4 h-4" /> Back to sign in
        </Link>
      </p>
    </div>
  );
}
