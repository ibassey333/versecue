"use client";

import { useOrg } from '@/contexts/OrgContext';
import { CreditCard, Loader2, Check } from 'lucide-react';

export default function BillingPage() {
  const { org, loading } = useOrg();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  const plans = [
    {
      name: 'Free',
      price: '£0',
      period: '/month',
      features: ['3 sessions/month', 'KJV translation', 'Basic display', 'VerseCue watermark'],
      current: org?.plan === 'free',
    },
    {
      name: 'Pro',
      price: '£15',
      period: '/month',
      features: ['Unlimited sessions', '3 translations', 'Custom display', 'No watermark', 'AI summaries'],
      current: org?.plan === 'pro',
      recommended: true,
    },
    {
      name: 'Church',
      price: '£40',
      period: '/month',
      features: ['Everything in Pro', 'Unlimited team', 'Multiple locations', 'Priority support'],
      current: org?.plan === 'church',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-verse-text mb-2">Billing & Plan</h1>
        <p className="text-verse-muted">Manage your subscription and billing details.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative rounded-2xl border-2 p-6 transition-all ${
              plan.current
                ? 'border-gold-500 bg-gold-500/5'
                : plan.recommended
                ? 'border-verse-border hover:border-gold-500/50'
                : 'border-verse-border hover:border-verse-muted'
            }`}
          >
            {plan.recommended && !plan.current && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gold-500 text-verse-bg text-xs font-semibold rounded-full">
                Recommended
              </div>
            )}
            {plan.current && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
                Current Plan
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-verse-text mb-2">{plan.name}</h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-bold text-verse-text">{plan.price}</span>
                <span className="text-verse-muted">{plan.period}</span>
              </div>
            </div>

            <ul className="space-y-3 mb-6">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-verse-muted">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <button
              disabled={plan.current}
              className={`w-full py-2.5 rounded-xl font-semibold transition-colors ${
                plan.current
                  ? 'bg-verse-border text-verse-muted cursor-not-allowed'
                  : 'bg-gold-500 text-verse-bg hover:bg-gold-400'
              }`}
            >
              {plan.current ? 'Current' : 'Upgrade'}
            </button>
          </div>
        ))}
      </div>

      <p className="text-center text-sm text-verse-muted">
        Stripe integration coming soon. Contact us at support@versecue.app for early access.
      </p>
    </div>
  );
}
