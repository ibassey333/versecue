"use client";

import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { parseScriptures } from '@/lib/detection/parser';

interface TestResult {
  name: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
  data?: string;
}

export default function TestPage() {
  const [results, setResults] = useState<TestResult[]>([
    { name: 'Local KJV', status: 'idle' },
    { name: 'API.Bible', status: 'idle' },
    { name: 'Deepgram', status: 'idle' },
    { name: 'Groq', status: 'idle' },
  ]);
  
  const [parserResults, setParserResults] = useState<string[]>([]);

  const updateResult = (name: string, update: Partial<TestResult>) => {
    setResults(prev => prev.map(r => r.name === name ? { ...r, ...update } : r));
  };

  const testParser = () => {
    const testCases = [
      'John 3:16',
      'Psalm 1:3',
      'John 5:1',
      'Romans 8:28',
      '1 Corinthians 13:4-7',
      'Psalm chapter 23 verse 1',
    ];
    
    const results: string[] = [];
    for (const test of testCases) {
      const parsed = parseScriptures(test);
      const found = parsed.length > 0 ? parsed[0].reference.reference : 'NOT FOUND';
      results.push(`"${test}" => ${found}`);
    }
    setParserResults(results);
  };

  const testLocalKJV = async () => {
    updateResult('Local KJV', { status: 'loading' });
    try {
      const response = await fetch('/bibles/kjv.json');
      if (!response.ok) {
        updateResult('Local KJV', { status: 'error', message: `HTTP ${response.status}` });
        return;
      }
      const data = await response.json();
      const john316 = data?.John?.['3']?.['16'];
      if (john316) {
        updateResult('Local KJV', { 
          status: 'success', 
          message: 'John 3:16 loaded',
          data: john316.substring(0, 80) + '...'
        });
      } else {
        updateResult('Local KJV', { status: 'error', message: 'Verse not found' });
      }
    } catch (err: any) {
      updateResult('Local KJV', { status: 'error', message: err.message });
    }
  };

  const testApiBible = async () => {
    updateResult('API.Bible', { status: 'loading' });
    
    const apiKey = process.env.NEXT_PUBLIC_API_BIBLE_KEY;
    console.log('API Key available:', !!apiKey);
    console.log('API Key first 10:', apiKey?.substring(0, 10));
    
    if (!apiKey) {
      updateResult('API.Bible', { status: 'error', message: 'NEXT_PUBLIC_API_BIBLE_KEY not set' });
      return;
    }

    try {
      // Test with WEB Bible - John 3:16
      const bibleId = '9879dbb7cfe39e4d-02';
      const passageId = 'JHN.3.16';
      const url = `https://rest.api.bible/v1/bibles/${bibleId}/passages/${passageId}?content-type=text&include-notes=false&include-titles=false`;
      
      console.log('Fetching:', url);
      
      const response = await fetch(url, { 
        headers: { 'api-key': apiKey }
      });

      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response body:', responseText.substring(0, 200));

      if (!response.ok) {
        updateResult('API.Bible', { 
          status: 'error', 
          message: `HTTP ${response.status}: ${responseText.substring(0, 100)}` 
        });
        return;
      }

      const data = JSON.parse(responseText);
      updateResult('API.Bible', { 
        status: 'success', 
        message: 'John 3:16 (WEB)',
        data: data.data?.content?.trim().substring(0, 100) + '...'
      });
    } catch (err: any) {
      console.error('API.Bible error:', err);
      updateResult('API.Bible', { status: 'error', message: err.message });
    }
  };

  const testDeepgram = async () => {
    updateResult('Deepgram', { status: 'loading' });
    
    const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_KEY;
    if (!apiKey) {
      updateResult('Deepgram', { status: 'error', message: 'NEXT_PUBLIC_DEEPGRAM_KEY not set' });
      return;
    }

    // Note: Deepgram requires server-side or WebSocket for actual use
    // This just validates the key format
    updateResult('Deepgram', { 
      status: 'success', 
      message: 'Key is set (requires WebSocket for actual use)',
      data: `Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`
    });
  };

  const testGroq = async () => {
    updateResult('Groq', { status: 'loading' });
    
    const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
    if (!apiKey) {
      updateResult('Groq', { status: 'error', message: 'NEXT_PUBLIC_GROQ_API_KEY not set' });
      return;
    }

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: 'Reply with exactly: "Groq works"' }],
          max_tokens: 10
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        updateResult('Groq', { status: 'error', message: `HTTP ${response.status}` });
        return;
      }

      const data = await response.json();
      updateResult('Groq', { 
        status: 'success', 
        message: 'LLM responded',
        data: data.choices?.[0]?.message?.content || 'Response received'
      });
    } catch (err: any) {
      updateResult('Groq', { status: 'error', message: err.message });
    }
  };

  const runAllTests = async () => {
    testParser();
    await Promise.all([testLocalKJV(), testApiBible(), testDeepgram(), testGroq()]);
  };

  useEffect(() => { testParser(); }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loading': return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
      case 'success': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-[#d4af37] mb-2">VerseCue Diagnostics</h1>
        <p className="text-gray-400 mb-8">Test all components</p>
        
        <button onClick={runAllTests} className="mb-8 px-6 py-3 bg-[#d4af37] text-black font-semibold rounded-xl hover:bg-[#c9a227]">
          Run All Tests
        </button>

        {/* Parser Test */}
        <div className="mb-8 p-4 rounded-xl border border-gray-800 bg-[#12121a]">
          <h2 className="font-semibold text-lg mb-3">📝 Parser Test</h2>
          <div className="font-mono text-sm space-y-1">
            {parserResults.map((r, i) => (
              <div key={i} className={r.includes('NOT FOUND') ? 'text-red-400' : 'text-green-400'}>{r}</div>
            ))}
          </div>
        </div>

        {/* API Tests */}
        <div className="space-y-4">
          {results.map((result) => (
            <div key={result.name} className="p-4 rounded-xl border border-gray-800 bg-[#12121a]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {getStatusIcon(result.status)}
                  <span className="font-semibold text-lg">{result.name}</span>
                </div>
                <button
                  onClick={() => {
                    if (result.name === 'Local KJV') testLocalKJV();
                    if (result.name === 'API.Bible') testApiBible();
                    if (result.name === 'Deepgram') testDeepgram();
                    if (result.name === 'Groq') testGroq();
                  }}
                  className="text-sm text-[#d4af37] hover:underline"
                >Test</button>
              </div>
              {result.message && <p className={`text-sm ${result.status === 'error' ? 'text-red-400' : 'text-gray-400'}`}>{result.message}</p>}
              {result.data && <p className="text-sm text-green-400 mt-2 font-mono bg-black/30 p-2 rounded">{result.data}</p>}
            </div>
          ))}
        </div>

        {/* Env Vars */}
        <div className="mt-8 p-4 rounded-xl border border-gray-800 bg-[#12121a]">
          <h2 className="font-semibold text-lg mb-3">Environment Variables</h2>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">NEXT_PUBLIC_API_BIBLE_KEY</span>
              <span className={process.env.NEXT_PUBLIC_API_BIBLE_KEY ? 'text-green-500' : 'text-red-500'}>
                {process.env.NEXT_PUBLIC_API_BIBLE_KEY ? `✓ ${process.env.NEXT_PUBLIC_API_BIBLE_KEY.substring(0, 10)}...` : '✗ Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">NEXT_PUBLIC_DEEPGRAM_KEY</span>
              <span className={process.env.NEXT_PUBLIC_DEEPGRAM_KEY ? 'text-green-500' : 'text-red-500'}>
                {process.env.NEXT_PUBLIC_DEEPGRAM_KEY ? '✓ Set' : '✗ Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">NEXT_PUBLIC_GROQ_API_KEY</span>
              <span className={process.env.NEXT_PUBLIC_GROQ_API_KEY ? 'text-green-500' : 'text-red-500'}>
                {process.env.NEXT_PUBLIC_GROQ_API_KEY ? '✓ Set' : '✗ Not set'}
              </span>
            </div>
          </div>
        </div>

        <p className="mt-8 text-sm text-gray-500">
          <strong>Note:</strong> Restart dev server after changing .env.local
        </p>
        <p className="mt-2"><a href="/" className="text-[#d4af37] hover:underline">← Back to Dashboard</a></p>
      </div>
    </div>
  );
}
