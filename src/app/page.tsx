"use client";
import dynamic from 'next/dynamic';

const Dashboard = dynamic(() => import('@/components/Dashboard'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-verse-bg flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gold-400 mb-2">VerseCue</h1>
        <p className="text-verse-muted">Loading...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  return <Dashboard />;
}
