'use client';

import { useEffect, useState, useRef } from 'react';
import { useSessionStore } from '@/stores/session';
import { detectScriptures } from '@/lib/detection';

export default function Dashboard() {
  const store = useSessionStore();
  const {
    isListening,
    isPaused,
    transcript,
    interimTranscript,
    detectionQueue,
    approvedQueue,
    currentDisplay,
    audioLevel,
    stats,
    settings,
    toggleListening,
    togglePause,
    addTranscriptSegment,
    setInterimTranscript,
    setAudioLevel,
    addDetection,
    approveDetection,
    dismissDetection,
    displayScripture,
    clearDisplay,
    goToNextVerse,
    goToPrevVerse,
    removeFromApproved,
    updateSettings,
  } = store;

  const [showSettings, setShowSettings] = useState(false);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    let isStoppingRef = false;

    recognition.onresult = async (event: any) => {
      let interim = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += text;
        } else {
          interim += text;
        }
      }

      if (interim) setInterimTranscript(interim);

      if (finalText) {
        addTranscriptSegment({
          id: `seg_${Date.now()}`,
          text: finalText,
          timestamp: new Date(),
          isFinal: true,
        });

        const detections = await detectScriptures(finalText);
        detections.forEach(d => addDetection(d));
      }
    };

    recognition.onerror = () => {};
    recognition.onend = () => {
      if (isListening && !isPaused && !isStoppingRef) {
        setTimeout(() => { try { recognition.start(); } catch(e) {} }, 100);
      }
    };

    if (isListening && !isPaused) {
      try { recognition.start(); } catch(e) {}
    }

    return () => {
      isStoppingRef = true;
      try { recognition.stop(); } catch(e) {}
    };
  }, [isListening, isPaused]);

  // Audio level meter
  useEffect(() => {
    if (!isListening) {
      setAudioLevel(0);
      return;
    }

    let animationId: number;
    
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(Math.min(100, avg * 1.5));
        animationId = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    }).catch(() => {});

    return () => {
      cancelAnimationFrame(animationId);
      audioContextRef.current?.close();
    };
  }, [isListening]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.repeat && approvedQueue.length > 0) {
        e.preventDefault();
        displayScripture(approvedQueue[0].id);
      }
      if (e.key === 'Escape') clearDisplay();
      if (e.key === 'ArrowRight' && currentDisplay) goToNextVerse();
      if (e.key === 'ArrowLeft' && currentDisplay) goToPrevVerse();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [approvedQueue, currentDisplay]);

  const formatTime = (date: Date) => new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <span className="text-slate-900 text-lg font-bold">📖</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">VerseCue</h1>
              <p className="text-xs text-slate-400">SCRIPTURE DETECTION</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              isListening ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-slate-700 text-slate-400'
            }`}>
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${isListening ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`}></span>
              {isListening ? 'Live' : 'Ready'}
            </div>
            <a href="/display" target="_blank" className="text-amber-400 hover:text-amber-300 text-sm font-medium">
              Open Display ↗
            </a>
            <button onClick={() => setShowSettings(!showSettings)} className="p-2 text-slate-400 hover:text-white">
              ⚙️
            </button>
          </div>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-slate-800 border-b border-slate-700 px-4 py-3">
          <div className="max-w-7xl mx-auto flex gap-6 items-center">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={settings.autoApprove}
                onChange={(e) => updateSettings({ autoApprove: e.target.checked })}
                className="rounded"
              />
              Auto-approve high confidence
            </label>
            <span className="text-slate-500">|</span>
            <span className="text-sm text-slate-400">Translation: KJV</span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleListening}
            className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all ${
              isListening
                ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 hover:from-amber-400 hover:to-amber-500'
            }`}
          >
            {isListening ? '⏹ Stop Listening' : '🎤 Start Listening'}
          </button>
          
          {isListening && (
            <>
              <button
                onClick={togglePause}
                className="px-4 py-3 rounded-xl bg-slate-700 text-slate-300 hover:bg-slate-600"
              >
                {isPaused ? '▶ Resume' : '⏸ Pause'}
              </button>
              
              {/* Audio Level Meter */}
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-sm">🎙</span>
                <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-amber-500 transition-all duration-75"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-8 grid grid-cols-3 gap-6">
        {/* Column 1: Transcript */}
        <div className="space-y-4">
          <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50">
            <h2 className="text-sm font-medium text-slate-400 mb-4 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isListening && !isPaused ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></span>
              LIVE TRANSCRIPT
            </h2>
            <div className="h-80 overflow-y-auto space-y-2 text-slate-300 text-sm leading-relaxed">
              {transcript.map((seg) => (
                <p key={seg.id}>{seg.text}</p>
              ))}
              {interimTranscript && (
                <p className="text-slate-500 italic">{interimTranscript}</p>
              )}
              {transcript.length === 0 && !interimTranscript && (
                <p className="text-slate-600 italic text-center py-8">
                  Transcript will appear here as you speak...
                </p>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700/50 text-xs text-slate-500">
              {transcript.length} segments
            </div>
          </div>

          {/* Search */}
          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
            <input
              type="text"
              placeholder="Search scripture... (e.g., John 3:16)"
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            <p className="text-xs text-slate-500 mt-2">Press / to focus</p>
          </div>
        </div>

        {/* Column 2: Detection Queues */}
        <div className="space-y-4">
          {/* Needs Review */}
          <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50">
            <h2 className="text-sm font-medium text-slate-400 mb-4">NEEDS REVIEW</h2>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {detectionQueue.length === 0 ? (
                <div className="text-center py-6 text-slate-600">
                  <div className="text-3xl mb-2">✓</div>
                  <p className="text-sm">Low-confidence detections appear here</p>
                </div>
              ) : detectionQueue.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-slate-700/50 rounded-xl p-3">
                  <span className="text-amber-400 font-medium">{item.reference.reference}</span>
                  <div className="flex gap-2">
                    <button onClick={() => approveDetection(item.id)} className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30">✓</button>
                    <button onClick={() => dismissDetection(item.id)} className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ready to Display */}
          <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50">
            <h2 className="text-sm font-medium text-slate-400 mb-4">
              READY TO DISPLAY <span className="text-amber-400 ml-1">{approvedQueue.length}</span>
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {approvedQueue.length === 0 ? (
                <div className="text-center py-6 text-slate-600">
                  <div className="text-3xl mb-2">📋</div>
                  <p className="text-sm">Approved scriptures appear here</p>
                </div>
              ) : approvedQueue.map((item) => (
                <div key={item.id} className={`rounded-xl p-3 ${item.displayedAt ? 'bg-slate-700/30' : 'bg-slate-700/50'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-amber-400 font-medium">{item.reference.reference}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => displayScripture(item.id)}
                        className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-sm hover:bg-amber-500/30"
                      >
                        {item.displayedAt ? 'Re-display' : 'Display'} ↵
                      </button>
                      <button
                        onClick={() => removeFromApproved(item.id)}
                        className="text-slate-500 hover:text-red-400"
                      >✕</button>
                    </div>
                  </div>
                  {item.verseText && (
                    <p className="text-slate-400 text-sm truncate">{item.verseText.slice(0, 80)}...</p>
                  )}
                  {item.displayedAt && (
                    <span className="text-xs text-green-500">✓ Shown at {formatTime(item.displayedAt)}</span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-600 mt-3">Enter = display first • ← → = navigate verses</p>
          </div>
        </div>

        {/* Column 3: Display Preview + Stats */}
        <div className="space-y-4">
          {/* Display Preview */}
          <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-slate-400">DISPLAY PREVIEW</h2>
              {currentDisplay && (
                <button onClick={clearDisplay} className="text-slate-500 hover:text-red-400 text-sm">
                  Clear ✕
                </button>
              )}
            </div>
            <div className="bg-slate-900 rounded-xl p-6 min-h-56 flex items-center justify-center">
              {currentDisplay ? (
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-amber-400 mb-4">{currentDisplay.reference.reference}</h3>
                  {currentDisplay.verseText && (
                    <p className="text-slate-300 italic text-sm leading-relaxed">"{currentDisplay.verseText}"</p>
                  )}
                  <p className="text-slate-600 text-xs mt-4">{currentDisplay.translation}</p>
                  <div className="flex justify-center gap-2 mt-4">
                    <button onClick={goToPrevVerse} className="px-3 py-1.5 bg-slate-700 rounded-lg text-sm hover:bg-slate-600">← Prev</button>
                    <button onClick={goToNextVerse} className="px-3 py-1.5 bg-slate-700 rounded-lg text-sm hover:bg-slate-600">Next →</button>
                  </div>
                </div>
              ) : (
                <p className="text-slate-600">Nothing displayed</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50">
            <h2 className="text-sm font-medium text-slate-400 mb-4">SESSION STATS</h2>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Detected', value: stats.detected, color: 'amber' },
                { label: 'Approved', value: stats.approved, color: 'green' },
                { label: 'Displayed', value: stats.displayed, color: 'blue' },
                { label: 'Dismissed', value: stats.dismissed, color: 'slate' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-700/50 rounded-xl p-3 text-center">
                  <div className={`text-2xl font-bold text-${color}-400`}>{value}</div>
                  <div className="text-xs text-slate-500 mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between text-xs text-slate-500">
          <span>VerseCue v1.0.0</span>
          <span>The right verse, right on time.</span>
        </div>
      </footer>
    </div>
  );
}
