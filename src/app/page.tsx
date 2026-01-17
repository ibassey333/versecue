"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BookOpen, Mic, Monitor, FileText, Sparkles, Users, 
  Check, ChevronRight, Play, ArrowRight, Menu, X,
  Zap, Shield, Clock, Download, Brain, Globe,
  ChevronDown, Star
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ============================================
// Navigation Component
// ============================================
function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    
    // Check auth
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '#features', label: 'Features' },
    { href: '#how-it-works', label: 'How It Works' },
    { href: '#pricing', label: 'Pricing' },
    { href: '#faq', label: 'FAQ' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'bg-verse-bg/95 backdrop-blur-xl border-b border-verse-border/50' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 shadow-lg shadow-gold-500/20">
              <BookOpen className="w-5 h-5 text-verse-bg" />
            </div>
            <span className="font-display text-xl font-bold text-gold-400">VerseCue</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-verse-muted hover:text-verse-text transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-4">
            {user ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-5 py-2.5 bg-gold-500 text-verse-bg font-semibold rounded-xl hover:bg-gold-400 transition-all shadow-lg shadow-gold-500/20"
              >
                Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-verse-muted hover:text-verse-text transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="flex items-center gap-2 px-5 py-2.5 bg-gold-500 text-verse-bg font-semibold rounded-xl hover:bg-gold-400 transition-all shadow-lg shadow-gold-500/20"
                >
                  Start Free Trial
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-verse-muted hover:text-verse-text"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-verse-surface border-b border-verse-border">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block py-2 text-verse-muted hover:text-verse-text transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-4 border-t border-verse-border space-y-3">
              {user ? (
                <Link
                  href="/dashboard"
                  className="block w-full text-center py-3 bg-gold-500 text-verse-bg font-semibold rounded-xl"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block w-full text-center py-3 border border-verse-border text-verse-text rounded-xl"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="block w-full text-center py-3 bg-gold-500 text-verse-bg font-semibold rounded-xl"
                  >
                    Start Free Trial
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

// ============================================
// Hero Section
// ============================================
function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-hero-glow opacity-50" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-verse-surface border border-verse-border mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-gold-400" />
            <span className="text-sm text-verse-muted">AI-Powered Scripture Detection</span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-verse-text leading-tight mb-6 animate-fade-in-up">
            The Right Verse,{" "}
            <span className="gradient-text">Right On Time</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-verse-muted max-w-2xl mx-auto mb-10 animate-fade-in-up delay-100">
            VerseCue listens to your sermon, automatically detects Bible references, 
            and displays them beautifully for your congregation. No more fumbling, 
            no more missed verses.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in-up delay-200">
            <Link
              href="/signup"
              className="flex items-center gap-2 px-8 py-4 bg-gold-500 text-verse-bg font-semibold rounded-xl hover:bg-gold-400 transition-all shadow-lg shadow-gold-500/20 hover:shadow-gold-500/30 hover:-translate-y-0.5"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#how-it-works"
              className="flex items-center gap-2 px-8 py-4 border border-verse-border text-verse-text font-semibold rounded-xl hover:bg-verse-surface transition-all"
            >
              <Play className="w-5 h-5" />
              See How It Works
            </a>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-verse-muted animate-fade-in-up delay-300">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span>Free 3-session trial</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span>Setup in 2 minutes</span>
            </div>
          </div>
        </div>

        {/* Product Preview */}
        <div className="mt-16 lg:mt-24 relative animate-fade-in-up delay-400">
          <div className="relative mx-auto max-w-5xl">
            {/* Glow effect behind */}
            <div className="absolute -inset-4 bg-gradient-to-r from-gold-500/20 via-gold-400/10 to-gold-500/20 rounded-3xl blur-2xl" />
            
            {/* Main Preview Card */}
            <div className="relative bg-verse-surface border border-verse-border rounded-2xl overflow-hidden shadow-2xl">
              {/* Browser Chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-verse-elevated border-b border-verse-border">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 bg-verse-bg rounded-lg text-xs text-verse-muted">
                    versecue.app/dashboard
                  </div>
                </div>
              </div>
              
              {/* App Preview Content */}
              <div className="p-6 lg:p-8 min-h-[400px] bg-verse-bg">
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Left: Controls */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-verse-surface rounded-xl border border-verse-border">
                      <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <Mic className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-verse-text">Listening...</p>
                        <p className="text-xs text-verse-muted">Detecting scriptures in real-time</p>
                      </div>
                      <div className="ml-auto flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="w-1 bg-green-500 rounded-full animate-pulse" style={{ 
                            height: `${12 + Math.random() * 16}px`,
                            animationDelay: `${i * 100}ms`
                          }} />
                        ))}
                      </div>
                    </div>
                    
                    {/* Detected Verses Queue */}
                    <div className="space-y-2">
                      <p className="text-xs text-verse-muted uppercase tracking-wide">Detected</p>
                      {["Romans 8:28", "John 3:16", "Psalm 23:1"].map((verse, i) => (
                        <div key={verse} className={`p-3 rounded-lg border ${i === 0 ? "bg-gold-500/10 border-gold-500/30" : "bg-verse-surface border-verse-border"}`}>
                          <p className={`text-sm font-medium ${i === 0 ? "text-gold-400" : "text-verse-text"}`}>{verse}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Right: Display Preview */}
                  <div className="bg-verse-surface rounded-xl border border-verse-border p-6 flex flex-col items-center justify-center text-center">
                    <p className="text-xs text-verse-muted uppercase tracking-wide mb-4">Now Displaying</p>
                    <p className="font-display text-2xl text-gold-400 mb-3">Romans 8:28</p>
                    <p className="font-scripture text-lg text-verse-text leading-relaxed">
                      &ldquo;And we know that in all things God works for the good of those who love him, 
                      who have been called according to his purpose.&rdquo;
                    </p>
                    <p className="text-sm text-verse-muted mt-4">KJV</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// Problem/Solution Section
// ============================================
function ProblemSolutionSection() {
  return (
    <section className="section-padding bg-verse-surface/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Problem */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">
              The Problem
            </div>
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-verse-text mb-6">
              Missed Verses, Distracted Congregation
            </h2>
            <div className="space-y-4 text-verse-muted">
              <p>
                Your pastor references a scripture. Half the congregation scrambles to find it on their phones. 
                The other half gives up and waits. By the time they find it, the moment has passed.
              </p>
              <ul className="space-y-3">
                {[
                  "Congregation misses key verses during powerful moments",
                  "Manual display updates are slow and error-prone",
                  "Volunteers struggle to keep up with spontaneous references",
                  "Phone-searching creates distraction, not engagement",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          {/* Solution */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm mb-6">
              The Solution
            </div>
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-verse-text mb-6">
              Automatic Detection, Instant Display
            </h2>
            <div className="space-y-4 text-verse-muted">
              <p>
                VerseCue listens to your sermon and automatically detects every Bible reference—whether 
                spoken directly or quoted from memory. Verses appear on screen the moment they are mentioned.
              </p>
              <ul className="space-y-3">
                {[
                  "AI detects explicit refs: John 3:16, Romans chapter 8",
                  "Recognizes quotes: For God so loved the world...",
                  "Understands context: the prodigal son, David and Goliath",
                  "One-click approval keeps you in control",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// How It Works Section
// ============================================
function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      title: "Start a Session",
      description: "Open VerseCue on any device. Click start. No complex setup required.",
      icon: Play,
    },
    {
      number: "02",
      title: "Speak Naturally",
      description: "Preach as you always do. VerseCue listens and detects scripture references in real-time.",
      icon: Mic,
    },
    {
      number: "03",
      title: "Approve & Display",
      description: "Detected verses queue up for review. One tap sends them to your congregation display.",
      icon: Monitor,
    },
    {
      number: "04",
      title: "Share & Review",
      description: "After service, get AI summaries, downloadable transcripts, and shareable sermon notes.",
      icon: FileText,
    },
  ];

  return (
    <section id="how-it-works" className="section-padding">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-verse-text mb-4">
            How It Works
          </h2>
          <p className="text-lg text-verse-muted">
            From setup to sermon summary in four simple steps
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-full w-full h-px bg-gradient-to-r from-verse-border to-transparent z-0" />
              )}
              
              <div className="relative bg-verse-surface border border-verse-border rounded-2xl p-6 premium-card">
                {/* Number */}
                <div className="text-5xl font-bold text-verse-border/50 mb-4">{step.number}</div>
                
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center mb-4">
                  <step.icon className="w-6 h-6 text-gold-400" />
                </div>
                
                {/* Content */}
                <h3 className="text-lg font-semibold text-verse-text mb-2">{step.title}</h3>
                <p className="text-sm text-verse-muted">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// Features Section
// ============================================
function FeaturesSection() {
  const features = [
    {
      icon: Brain,
      title: "Three-Layer Detection",
      description: "Regex parsing, phrase library, and AI combine to catch every reference—explicit or contextual.",
    },
    {
      icon: Zap,
      title: "Real-Time Processing",
      description: "Sub-second detection means verses appear on screen the moment they are spoken.",
    },
    {
      icon: Monitor,
      title: "Beautiful Display",
      description: "Clean, distraction-free verse display designed for projection screens and TVs.",
    },
    {
      icon: FileText,
      title: "AI Summaries",
      description: "Get professional sermon summaries with key points, themes, and action items.",
    },
    {
      icon: Download,
      title: "Export Anywhere",
      description: "Download transcripts and summaries as PDF, Word, or plain text.",
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Multiple operators can manage sessions. Perfect for larger churches.",
    },
    {
      icon: Globe,
      title: "Multiple Translations",
      description: "Switch between KJV, WEB, ASV, and more with a single click.",
    },
    {
      icon: Shield,
      title: "Private & Secure",
      description: "Your sermons stay yours. We do not store audio—only detected references.",
    },
  ];

  return (
    <section id="features" className="section-padding bg-verse-surface/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-verse-text mb-4">
            Everything You Need
          </h2>
          <p className="text-lg text-verse-muted">
            Powerful features designed for real-world church use
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-verse-bg border border-verse-border rounded-2xl p-6 premium-card"
            >
              <div className="w-12 h-12 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-gold-400" />
              </div>
              <h3 className="text-lg font-semibold text-verse-text mb-2">{feature.title}</h3>
              <p className="text-sm text-verse-muted">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// Pricing Section
// ============================================
function PricingSection() {
  const [annual, setAnnual] = useState(true);

  const plans = [
    {
      name: "Free",
      description: "Try VerseCue risk-free",
      price: { monthly: 0, annual: 0 },
      features: [
        "3 sessions total",
        "Basic detection (regex)",
        "KJV translation",
        "Display screen",
        "VerseCue watermark",
      ],
      cta: "Start Free",
      highlighted: false,
    },
    {
      name: "Pro",
      description: "For growing churches",
      price: { monthly: 19, annual: 15 },
      features: [
        "Unlimited sessions",
        "AI-powered detection",
        "3 translations",
        "AI sermon summaries",
        "PDF & Word export",
        "No watermark",
        "Email support",
      ],
      cta: "Start Free Trial",
      highlighted: true,
    },
    {
      name: "Church",
      description: "For larger congregations",
      price: { monthly: 49, annual: 40 },
      features: [
        "Everything in Pro",
        "Unlimited team members",
        "All translations",
        "Multiple locations",
        "Congregation app access",
        "Priority support",
        "Custom branding",
      ],
      cta: "Contact Sales",
      highlighted: false,
    },
  ];

  return (
    <section id="pricing" className="section-padding">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-verse-text mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-verse-muted mb-8">
            Start free. Upgrade when you are ready.
          </p>
          
          {/* Toggle */}
          <div className="inline-flex items-center gap-4 p-1.5 bg-verse-surface border border-verse-border rounded-xl">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                !annual ? "bg-gold-500 text-verse-bg" : "text-verse-muted hover:text-verse-text"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                annual ? "bg-gold-500 text-verse-bg" : "text-verse-muted hover:text-verse-text"
              }`}
            >
              Annual
              <span className="ml-2 text-xs opacity-75">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border-2 p-8 transition-all ${
                plan.highlighted
                  ? "border-gold-500 bg-verse-surface scale-105 shadow-2xl shadow-gold-500/10"
                  : "border-verse-border bg-verse-surface/50 hover:border-verse-muted"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gold-500 text-verse-bg text-sm font-semibold rounded-full">
                  Most Popular
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-xl font-semibold text-verse-text mb-2">{plan.name}</h3>
                <p className="text-sm text-verse-muted mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-verse-text">
                    £{annual ? plan.price.annual : plan.price.monthly}
                  </span>
                  {plan.price.monthly > 0 && (
                    <span className="text-verse-muted">/month</span>
                  )}
                </div>
                {annual && plan.price.monthly > 0 && (
                  <p className="text-sm text-verse-muted mt-1">
                    Billed annually (£{plan.price.annual * 12}/year)
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-verse-muted">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.name === "Church" ? "#contact" : "/signup"}
                className={`block w-full text-center py-3 rounded-xl font-semibold transition-all ${
                  plan.highlighted
                    ? "bg-gold-500 text-verse-bg hover:bg-gold-400"
                    : "bg-verse-bg border border-verse-border text-verse-text hover:bg-verse-elevated"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Enterprise note */}
        <p className="text-center text-sm text-verse-muted mt-12">
          Need a custom solution for multiple campuses?{" "}
          <a href="mailto:hello@versecue.app" className="text-gold-400 hover:text-gold-300">
            Contact us for Enterprise pricing
          </a>
        </p>
      </div>
    </section>
  );
}

// ============================================
// Testimonials Section
// ============================================
function TestimonialsSection() {
  const testimonials = [
    {
      quote: "VerseCue transformed our Sunday services. The congregation is more engaged than ever, and our volunteers love how easy it is to use.",
      author: "Pastor David Chen",
      role: "Senior Pastor",
      church: "Grace Community Church",
    },
    {
      quote: "We used to miss half the scripture references during sermons. Now every verse appears on screen instantly. It is like having a perfect assistant.",
      author: "Sarah Mitchell",
      role: "Media Director",
      church: "New Life Fellowship",
    },
    {
      quote: "The AI summaries have been a game-changer for our small groups. Members can review key points and discuss them throughout the week.",
      author: "Rev. Michael Okonkwo",
      role: "Lead Pastor",
      church: "Covenant Assembly",
    },
  ];

  return (
    <section className="section-padding bg-verse-surface/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-verse-text mb-4">
            Trusted by Churches
          </h2>
          <p className="text-lg text-verse-muted">
            See what pastors and ministry leaders are saying
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-verse-bg border border-verse-border rounded-2xl p-8 premium-card"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-gold-400 fill-gold-400" />
                ))}
              </div>
              
              {/* Quote */}
              <p className="text-verse-text mb-6 leading-relaxed">&ldquo;{testimonial.quote}&rdquo;</p>
              
              {/* Author */}
              <div>
                <p className="font-semibold text-verse-text">{testimonial.author}</p>
                <p className="text-sm text-verse-muted">{testimonial.role}</p>
                <p className="text-sm text-gold-400">{testimonial.church}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// FAQ Section
// ============================================
function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "How accurate is the scripture detection?",
      answer: "VerseCue uses a three-layer detection system: regex parsing for explicit references (John 3:16), a phrase library for famous quotes, and AI for contextual references (like the prodigal son). In testing, it catches 95%+ of scripture references with very few false positives."
    },
    {
      question: "What equipment do I need?",
      answer: "Just a computer or tablet with a microphone and internet connection. VerseCue works in your browser—no special software to install. For the display, you can use any screen connected to a computer, or open the display URL on a dedicated device."
    },
    {
      question: "Can I use my own microphone?",
      answer: "Yes! VerseCue works with any microphone your device recognizes. For best results in larger venues, we recommend using a lapel mic or the same audio feed that goes to your sound system."
    },
    {
      question: "What Bible translations are supported?",
      answer: "The free tier includes KJV. Pro plans add WEB and ASV. Church plans include all available translations. We are constantly adding more based on user requests."
    },
    {
      question: "Is my sermon data private?",
      answer: "Absolutely. We do not store audio recordings—only the detected scripture references and your session notes. Your sermon content stays on your device. All data is encrypted in transit and at rest."
    },
    {
      question: "Can multiple people operate VerseCue during a service?",
      answer: "Yes! Church plan subscribers can add unlimited team members. This is perfect for having one person approve verses while another manages the display, or for training new volunteers."
    },
    {
      question: "What happens if I exceed my session limit?",
      answer: "On the free tier, after 3 sessions you will be prompted to upgrade. We will not cut you off mid-sermon—your current session will always complete. You can upgrade anytime to continue."
    },
    {
      question: "Do you offer discounts for small churches?",
      answer: "Yes! We offer special pricing for churches under 100 members and for churches in developing nations. Contact us at hello@versecue.app to discuss your situation."
    },
  ];

  return (
    <section id="faq" className="section-padding">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-verse-text mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-verse-muted">
            Everything you need to know about VerseCue
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-verse-border rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-5 text-left bg-verse-surface hover:bg-verse-elevated transition-colors"
              >
                <span className="font-medium text-verse-text pr-4">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-verse-muted flex-shrink-0 transition-transform ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-5 pb-5 bg-verse-surface">
                  <p className="text-verse-muted leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// CTA Section
// ============================================
function CTASection() {
  return (
    <section className="section-padding">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-verse-surface to-verse-elevated border border-verse-border p-8 lg:p-16">
          {/* Background glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl" />
          
          <div className="relative text-center max-w-2xl mx-auto">
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-verse-text mb-4">
              Ready to Transform Your Services?
            </h2>
            <p className="text-lg text-verse-muted mb-8">
              Join churches already using VerseCue to engage their congregations with scripture. 
              Start your free trial today—no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="flex items-center gap-2 px-8 py-4 bg-gold-500 text-verse-bg font-semibold rounded-xl hover:bg-gold-400 transition-all shadow-lg shadow-gold-500/20"
              >
                Start Your Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="mailto:hello@versecue.app"
                className="flex items-center gap-2 px-8 py-4 border border-verse-border text-verse-text font-semibold rounded-xl hover:bg-verse-surface transition-all"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// Footer
// ============================================
function Footer() {
  return (
    <footer className="border-t border-verse-border py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 lg:gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600">
                <BookOpen className="w-5 h-5 text-verse-bg" />
              </div>
              <span className="font-display text-xl font-bold text-gold-400">VerseCue</span>
            </Link>
            <p className="text-verse-muted max-w-sm mb-4">
              AI-powered scripture detection and display for churches. 
              The right verse, right on time.
            </p>
            <p className="text-sm text-verse-subtle">
              © {new Date().getFullYear()} VerseCue. All rights reserved.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-verse-text mb-4">Product</h4>
            <ul className="space-y-2">
              {["Features", "Pricing", "FAQ", "Changelog"].map((link) => (
                <li key={link}>
                  <a href={`#${link.toLowerCase()}`} className="text-verse-muted hover:text-verse-text transition-colors text-sm">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-verse-text mb-4">Support</h4>
            <ul className="space-y-2">
              {[
                { label: "Help Center", href: "#" },
                { label: "Contact Us", href: "mailto:hello@versecue.app" },
                { label: "Privacy Policy", href: "#" },
                { label: "Terms of Service", href: "#" },
              ].map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-verse-muted hover:text-verse-text transition-colors text-sm">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-verse-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-verse-subtle">
            Made with ♥ for churches worldwide
          </p>
          <div className="flex items-center gap-2 text-sm text-verse-subtle">
            <Shield className="w-4 h-4" />
            <span>Your data is encrypted and secure</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ============================================
// Main Landing Page
// ============================================
export default function LandingPage() {
  return (
    <main className="min-h-screen bg-verse-bg">
      <Navigation />
      <HeroSection />
      <ProblemSolutionSection />
      <HowItWorksSection />
      <FeaturesSection />
      <PricingSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </main>
  );
}
