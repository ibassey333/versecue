'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  X, Youtube, Upload, FileAudio, Clock, Loader2, Check,
  AlertCircle, ChevronDown, Edit3, Save, Download,
  Copy, FileText, Languages, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Song, SongSection } from '@/types';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
interface YouTubeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (song: Song) => void;
  organizationId?: string;
}

type Step = 'input' | 'processing' | 'preview' | 'complete';
type TimeMode = 'full' | 'section' | 'service';

interface BatchResult {
  url: string; title: string; artist: string;
  status: 'pending' | 'downloading' | 'transcribing' | 'formatting' | 'complete' | 'error';
  lyrics: string; sections: SongSection[]; error: string; selected: boolean;
}

interface ProcessStep { id: string; label: string; status: 'pending' | 'active' | 'complete' | 'error'; }
interface ParsedUrlLine { url: string; start?: number; end?: number; }
interface ServiceSegment { title: string; start: string; end: string; }

// ============================================================================
// CONSTANTS
// ============================================================================
const LANG_LIST = [
  { code: 'auto', label: '\u{1F310} Auto-detect', cat: 'default' },
  { code: 'en', label: '\u{1F1EC}\u{1F1E7} English', cat: 'global' },
  { code: 'es', label: '\u{1F1EA}\u{1F1F8} Spanish', cat: 'global' },
  { code: 'pt', label: '\u{1F1E7}\u{1F1F7} Portuguese', cat: 'global' },
  { code: 'fr', label: '\u{1F1EB}\u{1F1F7} French', cat: 'global' },
  { code: 'yo', label: '\u{1F1F3}\u{1F1EC} Yoruba', cat: 'west' },
  { code: 'ig', label: '\u{1F1F3}\u{1F1EC} Igbo', cat: 'west' },
  { code: 'ha', label: '\u{1F1F3}\u{1F1EC} Hausa', cat: 'west' },
  { code: 'pcm', label: '\u{1F1F3}\u{1F1EC} Pidgin', cat: 'west' },
  { code: 'tw', label: '\u{1F1EC}\u{1F1ED} Twi', cat: 'west' },
  { code: 'sw', label: '\u{1F1F0}\u{1F1EA} Swahili', cat: 'east' },
  { code: 'am', label: '\u{1F1EA}\u{1F1F9} Amharic', cat: 'east' },
  { code: 'zu', label: '\u{1F1FF}\u{1F1E6} Zulu', cat: 'east' },
  { code: 'sn', label: '\u{1F1FF}\u{1F1FC} Shona', cat: 'east' },
  { code: 'ko', label: '\u{1F1F0}\u{1F1F7} Korean', cat: 'asia' },
  { code: 'zh', label: '\u{1F1E8}\u{1F1F3} Chinese', cat: 'asia' },
  { code: 'tl', label: '\u{1F1F5}\u{1F1ED} Tagalog', cat: 'asia' },
  { code: 'hi', label: '\u{1F1EE}\u{1F1F3} Hindi', cat: 'asia' },
  { code: 'id', label: '\u{1F1EE}\u{1F1E9} Indonesian', cat: 'asia' },
  { code: 'de', label: '\u{1F1E9}\u{1F1EA} German', cat: 'europe' },
  { code: 'ru', label: '\u{1F1F7}\u{1F1FA} Russian', cat: 'europe' },
  { code: 'ar', label: '\u{1F1F8}\u{1F1E6} Arabic', cat: 'asia' },
];

const CAT_LABELS: Record<string, string> = {
  default: 'Default', global: 'Global', west: 'West Africa',
  east: 'East / Southern Africa', asia: 'Asia', europe: 'Europe',
};

const ACCEPT = '.mp4,.mov,.webm,.mkv,.mp3,.wav,.m4a,.ogg,.flac';

// ============================================================================
// HELPERS
// ============================================================================
function isYtUrl(u: string) { return /youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\//.test(u); }
function ytId(u: string) { const m = u.match(/(?:v=|youtu\.be\/|embed\/)([\w-]+)/); return m?.[1] ?? null; }
function parseTime(t: string) { const p = t.split(':').map(Number); return p.length === 3 ? p[0]*3600+p[1]*60+p[2] : p.length === 2 ? p[0]*60+p[1] : p[0]||0; }
function fmtSize(b: number) { return b < 1048576 ? (b/1024).toFixed(1)+' KB' : (b/1048576).toFixed(1)+' MB'; }

function parseUrlLines(text: string): ParsedUrlLine[] {
  return text.split('\n').map(line => {
    const parts = line.trim().split(/\s+/);
    if (!parts[0] || !isYtUrl(parts[0])) return null;
    return { url: parts[0], start: parts[1] ? parseTime(parts[1]) : undefined, end: parts[2] ? parseTime(parts[2]) : undefined };
  }).filter((x): x is ParsedUrlLine => x !== null);
}

function getPlainText(title: string, artist: string, sections: SongSection[]) {
  let t = title + '\n' + artist + '\n\n';
  for (const s of sections) t += '[' + s.label + ']\n' + s.lyrics + '\n\n';
  return t.trim();
}

function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);
}

// ============================================================================
// LANGUAGE SELECTOR (inline accordion)
// ============================================================================
function MultiLangSelector({ selected, onChange }: { selected: string[]; onChange: (l: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const isAuto = selected.length === 0 || (selected.length === 1 && selected[0] === 'auto');

  const toggle = (code: string) => {
    if (code === 'auto') { onChange(['auto']); setOpen(false); return; }
    let next = selected.filter(c => c !== 'auto');
    if (next.includes(code)) next = next.filter(c => c !== code);
    else if (next.length < 3) next.push(code);
    onChange(next.length === 0 ? ['auto'] : next);
  };

  const filtered = LANG_LIST.filter(l =>
    l.label.toLowerCase().includes(search.toLowerCase()) || l.code.includes(search.toLowerCase())
  );
  const groups = Object.entries(CAT_LABELS)
    .map(([cat, label]) => ({ label, langs: filtered.filter(l => l.cat === cat) }))
    .filter(g => g.langs.length > 0);

  return (
    <div>
      <button type="button" onClick={() => { setOpen(!open); setSearch(''); }}
        className="w-full flex items-center justify-between px-4 py-3 bg-verse-bg border border-verse-border rounded-xl text-verse-text hover:border-verse-muted transition-colors">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Languages className="w-4 h-4 text-verse-muted flex-shrink-0" />
          {isAuto ? <span className="text-verse-muted text-sm">Auto-detect</span> : (
            <div className="flex gap-1.5 flex-wrap">
              {selected.map(c => {
                const lang = LANG_LIST.find(l => l.code === c);
                if (!lang) return null;
                return (
                  <span key={c} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gold-500/20 text-gold-500 rounded-md text-xs font-medium">
                    {lang.label.split(' ').pop()}
                    <button type="button" onClick={e => { e.stopPropagation(); toggle(c); }} className="hover:text-gold-300"><X className="w-3 h-3" /></button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <ChevronDown className={cn('w-4 h-4 text-verse-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-2 bg-verse-bg border border-verse-border rounded-xl overflow-hidden">
          <div className="p-2 border-b border-verse-border">
            <input type="text" placeholder="Search languages..." value={search} onChange={e => setSearch(e.target.value)} autoFocus
              className="w-full px-3 py-2 bg-verse-bg border border-verse-border rounded-lg text-verse-text placeholder-verse-muted text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50" />
          </div>
          <div className="max-h-48 overflow-y-auto p-2">
            {groups.map(g => (
              <div key={g.label} className="mb-2">
                <p className="text-[10px] text-verse-muted uppercase tracking-wider px-2 py-1 font-medium">{g.label}</p>
                <div className="space-y-0.5">
                  {g.langs.map(l => {
                    const checked = l.code === 'auto' ? isAuto : selected.includes(l.code);
                    const disabled = !checked && !isAuto && selected.filter(c => c !== 'auto').length >= 3 && l.code !== 'auto';
                    return (
                      <button key={l.code} type="button" onClick={() => !disabled && toggle(l.code)} disabled={disabled}
                        className={cn('w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-left transition-colors',
                          checked ? 'bg-gold-500/15 text-gold-500' : 'text-verse-text hover:bg-verse-border/50', disabled && 'opacity-30 cursor-not-allowed')}>
                        <div className={cn('w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0',
                          checked ? 'bg-gold-500 border-gold-500' : 'border-verse-muted')}>
                          {checked && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className="truncate">{l.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <p className="text-[10px] text-verse-muted text-center py-1">Select up to 3 languages</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXPORT MENU (inline buttons)
// ============================================================================
function ExportMenu({ title, artist, sections, lyrics }: { title: string; artist: string; sections: SongSection[]; lyrics: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const getText = () => sections.length > 0 ? getPlainText(title, artist, sections) : (title + '\n' + artist + '\n\n' + lyrics);

  const handleExport = async (fmt: string) => {
    setOpen(false);
    if (fmt === 'clipboard') { await navigator.clipboard.writeText(getText()); setCopied(true); setTimeout(() => setCopied(false), 2000); return; }
    if (fmt === 'txt') { downloadBlob(new Blob([getText()], { type: 'text/plain' }), (title || 'lyrics') + '.txt'); return; }
    setLoading(fmt);
    try {
      const res = await fetch('/api/import/export', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: fmt, title: title || 'Untitled', artist: artist || 'Unknown', sections: sections.length > 0 ? sections : [{ type: 'verse', label: 'Lyrics', lyrics, order: 1 }] }) });
      if (!res.ok) throw new Error('Export failed');
      downloadBlob(await res.blob(), (title || 'lyrics') + '.' + fmt);
    } catch { alert('Export failed'); } finally { setLoading(null); }
  };

  const items = [
    { id: 'clipboard', label: copied ? 'Copied!' : 'Copy', icon: copied ? Check : Copy },
    { id: 'txt', label: 'TXT', icon: FileText },
    { id: 'docx', label: 'DOCX', icon: Download },
    { id: 'pdf', label: 'PDF', icon: Download },
  ];

  return (
    <div className="flex items-center gap-1">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 border border-verse-border text-verse-muted hover:text-verse-text rounded-lg text-xs transition-colors">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Export <ChevronDown className="w-3 h-3" />
        </button>
      ) : (
        <div className="flex items-center gap-1">
          {items.map(item => (
            <button key={item.id} type="button" onClick={() => handleExport(item.id)}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-verse-muted hover:text-verse-text hover:bg-verse-border/50 border border-verse-border rounded-lg transition-colors">
              <item.icon className="w-3 h-3" /> {item.label}
            </button>
          ))}
          <button type="button" onClick={() => setOpen(false)} className="p-1.5 text-verse-muted hover:text-verse-text rounded-lg hover:bg-verse-border/50"><X className="w-3 h-3" /></button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function YouTubeImportModal({ isOpen, onClose, onImportComplete, organizationId }: YouTubeImportModalProps) {
  // ---- State ----
  const [step, setStep] = useState<Step>('input');
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [urlInput, setUrlInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [languages, setLanguages] = useState<string[]>(['auto']);
  const [timeMode, setTimeMode] = useState<TimeMode>('full');
  const [startTime, setStartTime] = useState('0:00');
  const [endTime, setEndTime] = useState('5:00');
  const [serviceSegments, setServiceSegments] = useState<ServiceSegment[]>([{ title: '', start: '', end: '' }]);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const [batchCopied, setBatchCopied] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [lyrics, setLyrics] = useState('');
  const [sections, setSections] = useState<SongSection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDrag, setIsDrag] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [timeExpanded, setTimeExpanded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ---- Derived ----
  const urlLines = useMemo(() => parseUrlLines(urlInput), [urlInput]);
  const isSingleUrl = urlLines.length === 1 && files.length === 0;
  const isMultiUrl = urlLines.length > 1 && files.length === 0;
  const isSingleFile = files.length === 1 && urlLines.length === 0;
  const isMultiFile = files.length > 1 && urlLines.length === 0;
  const isService = isSingleUrl && timeMode === 'service';
  const hasInput = urlLines.length > 0 || files.length > 0;
  const firstUrlId = isSingleUrl ? ytId(urlLines[0].url) : null;

  const validSegments = serviceSegments.filter(s => s.start.trim() && s.end.trim());
  const canProcess = (() => {
    if (!hasInput) return false;
    if (isService) return validSegments.length > 0;
    return true;
  })();
  const processButtonText = (() => {
    if (isService) return `Extract ${validSegments.length} Song${validSegments.length !== 1 ? 's' : ''}`;
    if (isMultiUrl) return `Import ${urlLines.length} Songs`;
    if (isMultiFile) return `Import ${files.length} Songs`;
    return 'Extract & Transcribe';
  })();

  // ---- Lifecycle ----
  const reset = useCallback(() => {
    setStep('input'); setMode('single'); setUrlInput(''); setFiles([]);
    setTitle(''); setArtist(''); setLanguages(['auto']); setTimeMode('full');
    setStartTime('0:00'); setEndTime('5:00');
    setServiceSegments([{ title: '', start: '', end: '' }]);
    setBatchResults([]); setPreviewIdx(null); setBatchCopied(false);
    setProgress(0); setProgressMsg(''); setSteps([]);
    setLyrics(''); setSections([]); setError(null); setIsEditing(false);
    setVideoTitle(''); setTimeExpanded(false);
  }, []);

  const handleClose = useCallback(() => { reset(); onClose(); }, [reset, onClose]);

  useEffect(() => {
    if (!isSingleUrl) { setVideoTitle(''); return; }
    const id = ytId(urlLines[0].url);
    if (!id) return;
    fetch('https://noembed.com/embed?url=https://www.youtube.com/watch?v=' + id)
      .then(r => r.json()).then(d => setVideoTitle(d.title || '')).catch(() => {});
  }, [isSingleUrl, urlLines]);

  const updateStep = (id: string, status: ProcessStep['status']) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  // ---- Service segment helpers ----
  const updateSegment = (i: number, field: keyof ServiceSegment, value: string) => {
    setServiceSegments(prev => { const u = [...prev]; u[i] = { ...u[i], [field]: value }; return u; });
  };
  const addSegment = () => setServiceSegments(prev => [...prev, { title: '', start: '', end: '' }]);
  const removeSegment = (i: number) => setServiceSegments(prev => prev.filter((_, idx) => idx !== i));

  // ==== PROCESS: Single song (URL or file) ====
  const handleSingleProcess = useCallback(async () => {
    const isUrl = urlLines.length > 0;
    setMode('single'); setStep('processing'); setError(null); setSections([]); setLyrics('');
    setSteps([
      { id: 'download', label: isUrl ? 'Downloading audio' : 'Preparing audio', status: 'pending' },
      { id: 'transcribe', label: 'Transcribing lyrics', status: 'pending' },
      { id: 'format', label: 'Correcting & formatting', status: 'pending' },
    ]);
    try {
      updateStep('download', 'active'); setProgress(10);
      setProgressMsg(isUrl ? 'Downloading from YouTube...' : 'Preparing audio...');

      let audioBlob: Blob; let autoTitle = title; let autoArtist = artist;
      if (isUrl) {
        const body: Record<string, unknown> = { url: urlLines[0].url };
        if (timeMode === 'section') { body.startTime = parseTime(startTime); body.endTime = parseTime(endTime); }
        const res = await fetch('/api/import/youtube', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Download failed'); }
        const vt = decodeURIComponent(res.headers.get('X-Video-Title') || '');
        const vc = decodeURIComponent(res.headers.get('X-Video-Channel') || '');
        if (vt && !autoTitle) autoTitle = vt; if (vc && !autoArtist) autoArtist = vc;
        audioBlob = await res.blob();
      } else {
        audioBlob = files[0];
        if (!autoTitle) autoTitle = files[0].name.replace(/\.[^.]+$/, '');
      }

      updateStep('download', 'complete'); setProgress(30);

      updateStep('transcribe', 'active'); setProgress(40); setProgressMsg('Transcribing lyrics...');
      const fd = new FormData(); fd.append('audio', audioBlob); fd.append('languages', JSON.stringify(languages));
      const tRes = await fetch('/api/import/transcribe', { method: 'POST', body: fd });
      if (!tRes.ok) { const e = await tRes.json().catch(() => ({})); throw new Error(e.message || 'Transcription failed'); }
      const rawLyrics = (await tRes.json()).text || '';
      setLyrics(rawLyrics);
      updateStep('transcribe', 'complete'); setProgress(65);

      updateStep('format', 'active'); setProgress(75); setProgressMsg('Correcting & formatting...');
      try {
        const fRes = await fetch('/api/import/format-lyrics', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lyrics: rawLyrics, languages, title: autoTitle || undefined, artist: autoArtist || undefined }) });
        if (fRes.ok) {
          const fmt = await fRes.json();
          if (Array.isArray(fmt.sections)) { const valid = fmt.sections.filter((s: SongSection) => s.lyrics?.trim()); if (valid.length > 0) setSections(valid); }
          if (!autoTitle && fmt.suggestedTitle) autoTitle = fmt.suggestedTitle;
          if (!autoArtist && fmt.suggestedArtist) autoArtist = fmt.suggestedArtist;
        }
      } catch (e) { console.warn('Format failed:', e); }

      setTitle(autoTitle); setArtist(autoArtist);
      updateStep('format', 'complete'); setProgress(100); setStep('preview');
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); setStep('input'); }
  }, [urlInput, files, title, artist, languages, timeMode, startTime, endTime]);

  // ==== PROCESS: Batch URLs ====
  const handleBatchUrlProcess = useCallback(async () => {
    const urls = parseUrlLines(urlInput);
    const results: BatchResult[] = urls.map(u => ({ url: u.url, title: '', artist: '', status: 'pending' as const, lyrics: '', sections: [], error: '', selected: true }));
    setBatchResults(results); setMode('batch'); setStep('processing');
    setSteps([{ id: 'batch', label: 'Starting batch...', status: 'active' }]);

    for (let i = 0; i < urls.length; i++) {
      setSteps([{ id: 'batch', label: `Processing ${i+1} of ${urls.length}`, status: 'active' }]);
      setProgress((i / urls.length) * 100); setProgressMsg(`Song ${i+1} of ${urls.length}`);
      try {
        results[i].status = 'downloading'; setBatchResults([...results]);
        const body: Record<string, unknown> = { url: urls[i].url };
        if (urls[i].start !== undefined) body.startTime = urls[i].start;
        if (urls[i].end !== undefined) body.endTime = urls[i].end;
        const dlRes = await fetch('/api/import/youtube', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!dlRes.ok) throw new Error('Download failed');
        results[i].title = decodeURIComponent(dlRes.headers.get('X-Video-Title') || 'Song ' + (i+1));
        results[i].artist = decodeURIComponent(dlRes.headers.get('X-Video-Channel') || '');

        results[i].status = 'transcribing'; setBatchResults([...results]);
        const blob = await dlRes.blob(); const fd = new FormData(); fd.append('audio', blob); fd.append('languages', JSON.stringify(languages));
        const tRes = await fetch('/api/import/transcribe', { method: 'POST', body: fd });
        if (!tRes.ok) throw new Error('Transcription failed');
        results[i].lyrics = (await tRes.json()).text;

        results[i].status = 'formatting'; setBatchResults([...results]);
        const fRes = await fetch('/api/import/format-lyrics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lyrics: results[i].lyrics, languages, title: results[i].title }) });
        if (fRes.ok) { const fmt = await fRes.json(); if (Array.isArray(fmt.sections)) results[i].sections = fmt.sections.filter((s: SongSection) => s.lyrics?.trim()); if (fmt.suggestedTitle) results[i].title = fmt.suggestedTitle; if (fmt.suggestedArtist) results[i].artist = fmt.suggestedArtist; }
        results[i].status = 'complete';
      } catch (err) { results[i].status = 'error'; results[i].error = err instanceof Error ? err.message : 'Failed'; }
      setBatchResults([...results]);
    }
    setProgress(100); setSteps([{ id: 'batch', label: `${results.filter(r => r.status === 'complete').length} of ${urls.length} complete`, status: 'complete' }]); setStep('preview');
  }, [urlInput, languages]);

  // ==== PROCESS: Multiple files ====
  const handleMultiFileProcess = useCallback(async () => {
    const results: BatchResult[] = files.map(f => ({ url: '', title: f.name.replace(/\.[^.]+$/, ''), artist: '', status: 'pending' as const, lyrics: '', sections: [], error: '', selected: true }));
    setBatchResults(results); setMode('batch'); setStep('processing');
    setSteps([{ id: 'batch', label: 'Starting...', status: 'active' }]);

    for (let i = 0; i < files.length; i++) {
      setSteps([{ id: 'batch', label: `Processing ${i+1} of ${files.length}`, status: 'active' }]);
      setProgress((i / files.length) * 100); setProgressMsg(`File ${i+1} of ${files.length}`);
      try {
        results[i].status = 'transcribing'; setBatchResults([...results]);
        const fd = new FormData(); fd.append('audio', files[i]); fd.append('languages', JSON.stringify(languages));
        const tRes = await fetch('/api/import/transcribe', { method: 'POST', body: fd });
        if (!tRes.ok) throw new Error('Transcription failed');
        results[i].lyrics = (await tRes.json()).text;

        results[i].status = 'formatting'; setBatchResults([...results]);
        const fRes = await fetch('/api/import/format-lyrics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lyrics: results[i].lyrics, languages, title: results[i].title }) });
        if (fRes.ok) { const fmt = await fRes.json(); if (Array.isArray(fmt.sections)) results[i].sections = fmt.sections.filter((s: SongSection) => s.lyrics?.trim()); if (fmt.suggestedTitle) results[i].title = fmt.suggestedTitle; if (fmt.suggestedArtist) results[i].artist = fmt.suggestedArtist; }
        results[i].status = 'complete';
      } catch (err) { results[i].status = 'error'; results[i].error = err instanceof Error ? err.message : 'Failed'; }
      setBatchResults([...results]);
    }
    setProgress(100); setSteps([{ id: 'batch', label: `${results.filter(r => r.status === 'complete').length} of ${files.length} complete`, status: 'complete' }]); setStep('preview');
  }, [files, languages]);

  // ==== PROCESS: Service extraction (download once, trim many) ====
  const handleServiceProcess = useCallback(async () => {
    const segs = serviceSegments.filter(s => s.start.trim() && s.end.trim());
    const urls = parseUrlLines(urlInput);
    if (segs.length === 0 || urls.length === 0) return;

    const results: BatchResult[] = segs.map((s, i) => ({
      url: urls[0].url, title: s.title || `Song ${i + 1}`, artist: '',
      status: 'pending' as const, lyrics: '', sections: [], error: '', selected: true,
    }));
    setBatchResults(results); setMode('batch'); setStep('processing');
    setSteps([
      { id: 'download', label: 'Downloading recording', status: 'active' },
      { id: 'extract', label: `Extracting ${segs.length} songs`, status: 'pending' },
    ]);

    try {
      setProgress(5); setProgressMsg('Downloading full recording...');
      const dlRes = await fetch('/api/import/youtube', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urls[0].url, downloadOnly: true }),
      });
      if (!dlRes.ok) { const e = await dlRes.json().catch(() => ({})); throw new Error(e.message || 'Download failed'); }
      const { tempId, channel } = await dlRes.json();
      updateStep('download', 'complete'); updateStep('extract', 'active'); setProgress(15);

      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i];
        setProgress(15 + ((i / segs.length) * 80));
        setProgressMsg(`Song ${i + 1}: ${seg.title || 'Extracting...'}`);
        setSteps(prev => prev.map(s => s.id === 'extract' ? { ...s, label: `Extracting song ${i + 1} of ${segs.length}` } : s));

        try {
          results[i].status = 'downloading'; setBatchResults([...results]);
          const trimRes = await fetch('/api/import/youtube', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tempId, startTime: parseTime(seg.start), endTime: parseTime(seg.end) }),
          });
          if (!trimRes.ok) throw new Error('Failed to extract segment');
          if (channel) results[i].artist = channel;

          results[i].status = 'transcribing'; setBatchResults([...results]);
          const audioBlob = await trimRes.blob();
          const fd = new FormData(); fd.append('audio', audioBlob); fd.append('languages', JSON.stringify(languages));
          const tRes = await fetch('/api/import/transcribe', { method: 'POST', body: fd });
          if (!tRes.ok) throw new Error('Transcription failed');
          results[i].lyrics = (await tRes.json()).text;

          results[i].status = 'formatting'; setBatchResults([...results]);
          try {
            const fRes = await fetch('/api/import/format-lyrics', { method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ lyrics: results[i].lyrics, languages, title: results[i].title }) });
            if (fRes.ok) {
              const fmt = await fRes.json();
              if (Array.isArray(fmt.sections)) results[i].sections = fmt.sections.filter((s: SongSection) => s.lyrics?.trim());
              if (fmt.suggestedTitle && results[i].title.startsWith('Song ')) results[i].title = fmt.suggestedTitle;
              if (fmt.suggestedArtist) results[i].artist = fmt.suggestedArtist;
            }
          } catch {}
          results[i].status = 'complete';
        } catch (err) { results[i].status = 'error'; results[i].error = err instanceof Error ? err.message : 'Failed'; }
        setBatchResults([...results]);
      }
      updateStep('extract', 'complete'); setProgress(100); setStep('preview');
    } catch (err) { setError(err instanceof Error ? err.message : 'Download failed'); setStep('input'); }
  }, [urlInput, serviceSegments, languages]);

  // ==== SAVE ====
  const handleSave = useCallback(async () => {
    if (!title.trim()) { setError('Enter a song title'); return; }
    try {
      const res = await fetch('/api/songs', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), artist: artist.trim() || 'Unknown Artist', lyrics, sections, source: 'custom', organizationId }) });
      if (!res.ok) throw new Error('Save failed');
      onImportComplete?.(await res.json()); setStep('complete');
    } catch (err) { setError(err instanceof Error ? err.message : 'Save failed'); }
  }, [title, artist, lyrics, sections, organizationId, onImportComplete]);

  const handleBatchSave = useCallback(async () => {
    for (const r of batchResults.filter(r => r.status === 'complete' && r.selected)) {
      try { const res = await fetch('/api/songs', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: r.title, artist: r.artist || 'Unknown', lyrics: r.lyrics, sections: r.sections, source: 'custom', organizationId }) });
        if (res.ok) onImportComplete?.(await res.json()); } catch {}
    }
    setStep('complete');
  }, [batchResults, organizationId, onImportComplete]);

  // ==== DISPATCH ====
  const handleProcess = () => {
    if (isService) handleServiceProcess();
    else if (isMultiUrl) handleBatchUrlProcess();
    else if (isMultiFile) handleMultiFileProcess();
    else handleSingleProcess();
  };

  if (!isOpen) return null;

  const renderSections = (secs: SongSection[], lyr: string) => {
    if (secs.length > 0) return (
      <div className="space-y-4">
        {secs.map((s, i) => (
          <div key={i}>
            <span className="text-gold-500 text-xs font-semibold uppercase tracking-wide">[{s.label}]</span>
            <p className="text-verse-text text-sm whitespace-pre-wrap mt-1 leading-relaxed">{s.lyrics}</p>
          </div>
        ))}
      </div>
    );
    return <p className="text-verse-text text-sm whitespace-pre-wrap leading-relaxed">{lyr || 'No lyrics'}</p>;
  };

  // ---- Batch export helper ----
  const batchExportSections = () => {
    const selected = batchResults.filter(r => r.status === 'complete' && r.selected);
    return selected.flatMap((r, idx) => {
      const secs = r.sections.length > 0 ? r.sections.map(s => ({ ...s })) : [{ type: 'verse' as const, label: 'Lyrics', lyrics: r.lyrics, order: 1 }];
      const titleLabel = r.title + (r.artist ? ' - ' + r.artist : '');
      if (secs.length > 0) secs[0] = { ...secs[0], label: (idx > 0 ? '---\n' : '') + titleLabel + '\n' + secs[0].label };
      return secs;
    });
  };
  const batchExportText = () => {
    const selected = batchResults.filter(r => r.status === 'complete' && r.selected);
    return selected.map(r => {
      const body = r.sections.length > 0 ? r.sections.map(s => '[' + s.label + ']\n' + s.lyrics).join('\n\n') : r.lyrics;
      return r.title + (r.artist ? ' - ' + r.artist : '') + '\n\n' + body;
    }).join('\n\n' + '='.repeat(40) + '\n\n');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-verse-card border border-verse-border rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-verse-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gold-500/20 flex items-center justify-center"><Youtube className="w-4 h-4 text-gold-500" /></div>
            <h2 className="text-lg font-semibold text-verse-text">Import Songs</h2>
          </div>
          <button type="button" onClick={handleClose} className="p-2 hover:bg-verse-border rounded-lg transition-colors"><X className="w-5 h-5 text-verse-muted" /></button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-5 min-h-0">

          {/* ========== INPUT ========== */}
          {step === 'input' && (
            <div className="space-y-4">

              {/* URL input — visible when no files */}
              {files.length === 0 && (
                <div>
                  <label className="block text-verse-muted text-xs mb-1.5">Paste YouTube URL(s)</label>
                  <textarea value={urlInput}
                    onChange={e => { setUrlInput(e.target.value); setError(null); }}
                    placeholder={'https://youtube.com/watch?v=...\n\nPaste multiple URLs for batch import'}
                    rows={urlLines.length > 1 ? 4 : 2}
                    className="w-full px-4 py-2.5 bg-verse-bg border border-verse-border rounded-xl text-verse-text placeholder-verse-muted text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50 font-mono resize-none" />
                  {isMultiUrl && (
                    <p className="text-verse-muted text-xs mt-1.5">
                      <span className="text-gold-500 font-semibold">{urlLines.length}</span> songs queued
                      <span className="text-verse-muted/60 ml-2">{'\u{1F4A1}'} Add time after URL: url 0:00 5:00</span>
                    </p>
                  )}
                </div>
              )}

              {/* Divider — only when both inputs are empty */}
              {urlLines.length === 0 && files.length === 0 && (
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-verse-border" />
                  <span className="text-verse-muted text-xs">or</span>
                  <div className="flex-1 h-px bg-verse-border" />
                </div>
              )}

              {/* File drop — visible when no URLs */}
              {urlLines.length === 0 && (
                files.length > 0 ? (
                  <div className="space-y-2">
                    {files.length > 1 && <p className="text-verse-text text-sm font-medium">{files.length} files selected</p>}
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-verse-bg rounded-xl border border-verse-border">
                        <FileAudio className="w-4 h-4 text-gold-500 flex-shrink-0" />
                        <span className="text-verse-text text-sm truncate flex-1">{f.name}</span>
                        <span className="text-verse-muted text-xs flex-shrink-0">{fmtSize(f.size)}</span>
                        <button type="button" onClick={() => setFiles(files.filter((_, idx) => idx !== i))} className="p-1 hover:bg-verse-border rounded"><X className="w-3 h-3 text-verse-muted" /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => fileRef.current?.click()} className="text-gold-500 text-xs hover:text-gold-400">+ Add more files</button>
                    <input ref={fileRef} type="file" accept={ACCEPT} multiple onChange={e => { if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]); }} className="hidden" />
                  </div>
                ) : (
                  <div onDragEnter={e => { e.preventDefault(); setIsDrag(true); }} onDragOver={e => e.preventDefault()} onDragLeave={e => { e.preventDefault(); setIsDrag(false); }}
                    onDrop={e => { e.preventDefault(); setIsDrag(false); if (e.dataTransfer.files.length > 0) { setFiles(Array.from(e.dataTransfer.files)); setUrlInput(''); } }}
                    onClick={() => fileRef.current?.click()}
                    className={cn('border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all', isDrag ? 'border-gold-500 bg-gold-500/10' : 'border-verse-border hover:border-verse-muted')}>
                    <input ref={fileRef} type="file" accept={ACCEPT} multiple onChange={e => { if (e.target.files) setFiles(Array.from(e.target.files)); }} className="hidden" />
                    <Upload className="w-10 h-10 text-verse-muted mx-auto mb-3" />
                    <p className="text-verse-text font-medium text-sm">Drop audio or video file(s)</p>
                    <p className="text-verse-muted text-xs mt-1">MP4, MP3, WAV, M4A, OGG, FLAC</p>
                  </div>
                )
              )}

              {/* ---- Single URL: thumbnail preview ---- */}
              {isSingleUrl && firstUrlId && (
                <div className="flex items-center gap-3 p-3 bg-verse-bg rounded-xl border border-verse-border">
                  <img src={'https://img.youtube.com/vi/' + firstUrlId + '/mqdefault.jpg'} alt="" className="w-20 h-14 rounded-lg object-cover flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-verse-text text-sm font-medium truncate">{videoTitle || 'Loading...'}</p>
                    <p className="text-green-400 text-xs">Ready to import</p>
                  </div>
                </div>
              )}

              {/* ---- Single (URL or file): Title + Artist ---- */}
              {(isSingleUrl || isSingleFile) && !isService && (
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-verse-muted text-xs mb-1">Title <span className="opacity-50">(optional)</span></label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Auto-detect"
                      className="w-full px-3 py-2 bg-verse-bg border border-verse-border rounded-xl text-verse-text placeholder-verse-muted text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50" /></div>
                  <div><label className="block text-verse-muted text-xs mb-1">Artist <span className="opacity-50">(optional)</span></label>
                    <input type="text" value={artist} onChange={e => setArtist(e.target.value)} placeholder="Auto-detect"
                      className="w-full px-3 py-2 bg-verse-bg border border-verse-border rounded-xl text-verse-text placeholder-verse-muted text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50" /></div>
                </div>
              )}

              {/* ---- Single URL: Time range options ---- */}
              {isSingleUrl && (
                <div className="bg-verse-bg/50 rounded-xl border border-verse-border/50 overflow-hidden">
                  <button type="button" onClick={() => setTimeExpanded(!timeExpanded)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-verse-border/20 transition-colors">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-verse-muted" />
                      <span className="text-verse-text text-sm">Time range</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-verse-muted text-xs">
                        {timeMode === 'full' ? 'Full video' : timeMode === 'section' ? `${startTime} → ${endTime}` : `${validSegments.length} song${validSegments.length !== 1 ? 's' : ''}`}
                      </span>
                      <ChevronDown className={cn('w-4 h-4 text-verse-muted transition-transform', timeExpanded && 'rotate-180')} />
                    </div>
                  </button>
                  {timeExpanded && (
                    <div className="px-4 pb-4 space-y-3">
                      {/* Radio: Full video */}
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="radio" name="timeMode" checked={timeMode === 'full'} onChange={() => setTimeMode('full')}
                          className="w-4 h-4 text-gold-500 border-verse-border bg-verse-bg focus:ring-gold-500" />
                        <span className="text-verse-text text-sm">Full video</span>
                      </label>
                      {/* Radio: Extract a section */}
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="radio" name="timeMode" checked={timeMode === 'section'} onChange={() => setTimeMode('section')}
                          className="w-4 h-4 text-gold-500 border-verse-border bg-verse-bg focus:ring-gold-500" />
                        <span className="text-verse-text text-sm">Extract a section</span>
                      </label>
                      {timeMode === 'section' && (
                        <div className="flex items-center gap-3 ml-7">
                          <input type="text" value={startTime} onChange={e => setStartTime(e.target.value)} placeholder="0:00"
                            className="w-20 px-2.5 py-1.5 bg-verse-bg border border-verse-border rounded-lg text-verse-text text-sm text-center focus:outline-none focus:ring-2 focus:ring-gold-500/50" />
                          <span className="text-verse-muted text-sm">{'\u2192'}</span>
                          <input type="text" value={endTime} onChange={e => setEndTime(e.target.value)} placeholder="5:00"
                            className="w-20 px-2.5 py-1.5 bg-verse-bg border border-verse-border rounded-lg text-verse-text text-sm text-center focus:outline-none focus:ring-2 focus:ring-gold-500/50" />
                        </div>
                      )}
                      {/* Radio: Multiple songs (service) */}
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="radio" name="timeMode" checked={timeMode === 'service'} onChange={() => setTimeMode('service')}
                          className="w-4 h-4 text-gold-500 border-verse-border bg-verse-bg focus:ring-gold-500" />
                        <span className="text-verse-text text-sm">Multiple songs from this recording</span>
                      </label>
                      {timeMode === 'service' && (
                        <div className="ml-7 space-y-2">
                          {serviceSegments.map((seg, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-verse-muted text-xs w-5 text-right">{i + 1}.</span>
                              <input type="text" value={seg.title} onChange={e => updateSegment(i, 'title', e.target.value)} placeholder={`Song ${i + 1}`}
                                className="flex-1 px-2.5 py-1.5 bg-verse-bg border border-verse-border rounded-lg text-verse-text placeholder-verse-muted text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50" />
                              <input type="text" value={seg.start} onChange={e => updateSegment(i, 'start', e.target.value)} placeholder="0:00"
                                className="w-[72px] px-2 py-1.5 bg-verse-bg border border-verse-border rounded-lg text-verse-text placeholder-verse-muted text-sm text-center focus:outline-none focus:ring-2 focus:ring-gold-500/50" />
                              <span className="text-verse-muted text-xs">{'\u2192'}</span>
                              <input type="text" value={seg.end} onChange={e => updateSegment(i, 'end', e.target.value)} placeholder="5:00"
                                className="w-[72px] px-2 py-1.5 bg-verse-bg border border-verse-border rounded-lg text-verse-text placeholder-verse-muted text-sm text-center focus:outline-none focus:ring-2 focus:ring-gold-500/50" />
                              {serviceSegments.length > 1 && (
                                <button type="button" onClick={() => removeSegment(i)} className="p-1 text-verse-muted hover:text-red-400 rounded hover:bg-verse-border/50"><X className="w-3 h-3" /></button>
                              )}
                            </div>
                          ))}
                          <button type="button" onClick={addSegment} className="text-gold-500 text-xs hover:text-gold-400 font-medium">+ Add Song</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ---- Languages (shown when there's input) ---- */}
              {hasInput && (
                <div className="p-3 bg-verse-bg/50 rounded-xl border border-verse-border/50">
                  <label className="flex items-center gap-2 text-verse-text text-sm font-medium mb-2">
                    <Languages className="w-4 h-4 text-gold-500" /> Languages in this song
                  </label>
                  <MultiLangSelector selected={languages} onChange={setLanguages} />
                  <p className="text-verse-muted text-[11px] mt-2">
                    {languages.some(l => !['auto','en'].includes(l)) ? '\u2713 Will correct lyrics using worship vocabulary' : 'Select languages for better accuracy with non-English songs'}
                  </p>
                </div>
              )}

              {error && <div className="flex items-start gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"><AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}</div>}
            </div>
          )}

          {/* ========== PROCESSING ========== */}
          {step === 'processing' && (
            <div className="py-6 space-y-6">
              <div className="space-y-3">
                {steps.map(s => (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
                      s.status === 'complete' && 'bg-green-500', s.status === 'active' && 'bg-gold-500',
                      s.status === 'pending' && 'bg-verse-border', s.status === 'error' && 'bg-red-500')}>
                      {s.status === 'complete' && <Check className="w-4 h-4 text-white" />}
                      {s.status === 'active' && <Loader2 className="w-4 h-4 text-verse-bg animate-spin" />}
                      {s.status === 'error' && <X className="w-4 h-4 text-white" />}
                    </div>
                    <span className={cn('text-sm font-medium', s.status === 'complete' && 'text-green-400', s.status === 'active' && 'text-gold-500', s.status === 'pending' && 'text-verse-muted', s.status === 'error' && 'text-red-400')}>{s.label}</span>
                  </div>
                ))}
              </div>
              {mode === 'batch' && batchResults.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {batchResults.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 bg-verse-bg rounded-lg">
                      <div className={cn('w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
                        r.status === 'complete' && 'bg-green-500', r.status === 'error' && 'bg-red-500',
                        ['downloading','transcribing','formatting'].includes(r.status) && 'bg-gold-500', r.status === 'pending' && 'bg-verse-border')}>
                        {r.status === 'complete' && <Check className="w-3 h-3 text-white" />}
                        {r.status === 'error' && <X className="w-3 h-3 text-white" />}
                        {['downloading','transcribing','formatting'].includes(r.status) && <Loader2 className="w-3 h-3 text-verse-bg animate-spin" />}
                      </div>
                      <span className="text-verse-text text-sm truncate flex-1">{r.title || r.url}</span>
                      <span className="text-verse-muted text-xs capitalize flex-shrink-0">{r.status}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                <div className="h-1.5 bg-verse-border rounded-full overflow-hidden"><div className="h-full bg-gold-500 transition-all duration-500 rounded-full" style={{ width: progress + '%' }} /></div>
                <p className="text-verse-muted text-xs text-center">{progressMsg}</p>
              </div>
            </div>
          )}

          {/* ========== PREVIEW (single) ========== */}
          {step === 'preview' && mode === 'single' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-verse-muted text-xs mb-1">Song Title</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter title"
                    className="w-full px-3 py-2 bg-verse-bg border border-verse-border rounded-lg text-verse-text text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50" /></div>
                <div><label className="block text-verse-muted text-xs mb-1">Artist</label>
                  <input type="text" value={artist} onChange={e => setArtist(e.target.value)} placeholder="Enter artist"
                    className="w-full px-3 py-2 bg-verse-bg border border-verse-border rounded-lg text-verse-text text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50" /></div>
              </div>
              <div className="border border-verse-border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-verse-bg border-b border-verse-border">
                  <span className="text-verse-text text-sm font-medium">Lyrics</span>
                  <div className="flex items-center gap-2">
                    <ExportMenu title={title} artist={artist} sections={sections} lyrics={lyrics} />
                    <button type="button" onClick={() => setIsEditing(!isEditing)}
                      className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors',
                        isEditing ? 'bg-gold-500 text-black font-semibold' : 'text-verse-muted hover:text-verse-text hover:bg-verse-border/50')}>
                      <Edit3 className="w-3 h-3" /> {isEditing ? 'Done' : 'Edit'}
                    </button>
                  </div>
                </div>
                {isEditing ? (
                  <textarea defaultValue={sections.length > 0 ? sections.map(s => '[' + s.label + ']\n' + s.lyrics).join('\n\n') : lyrics}
                    onChange={e => setLyrics(e.target.value)} style={{ backgroundColor: '#0d0d1a', border: 'none', outline: 'none' }}
                    className="w-full h-64 px-4 py-3 text-verse-text text-sm resize-none font-mono" />
                ) : (
                  <div className="h-64 overflow-y-auto px-4 py-3">{renderSections(sections, lyrics)}</div>
                )}
              </div>
              {sections.length > 0 && <p className="text-verse-muted text-xs text-center">{sections.length} sections detected</p>}
              {error && <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>}
            </div>
          )}

          {/* ========== PREVIEW (batch list) ========== */}
          {step === 'preview' && mode === 'batch' && previewIdx === null && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-verse-text text-sm font-medium">{batchResults.filter(r => r.status === 'complete').length} songs ready</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <button type="button" onClick={() => { navigator.clipboard.writeText(batchExportText()); setBatchCopied(true); setTimeout(() => setBatchCopied(false), 1500); }}
                    className={cn('text-xs flex items-center gap-1 px-2 py-1 border rounded-lg transition-colors', batchCopied ? 'text-green-400 border-green-400/30' : 'text-verse-muted hover:text-verse-text border-verse-border')}>
                    {batchCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {batchCopied ? 'Copied!' : 'Copy'}
                  </button>
                  <button type="button" onClick={() => { downloadBlob(new Blob([batchExportText()], { type: 'text/plain' }), 'worship-songs.txt'); }}
                    className="text-verse-muted text-xs hover:text-verse-text flex items-center gap-1 px-2 py-1 border border-verse-border rounded-lg">
                    <FileText className="w-3 h-3" /> TXT
                  </button>
                  {(['docx', 'pdf'] as const).map(fmt => (
                    <button key={fmt} type="button" onClick={async () => {
                      try {
                        const res = await fetch('/api/import/export', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ format: fmt, title: 'Worship Songs', artist: '', sections: batchExportSections() }) });
                        if (!res.ok) throw new Error('Export failed');
                        downloadBlob(await res.blob(), 'worship-songs.' + fmt);
                      } catch { alert('Export failed'); }
                    }} className="text-verse-muted text-xs hover:text-verse-text flex items-center gap-1 px-2 py-1 border border-verse-border rounded-lg">
                      <Download className="w-3 h-3" /> {fmt.toUpperCase()}
                    </button>
                  ))}
                  <button type="button" onClick={() => setBatchResults(batchResults.map(r => ({ ...r, selected: !batchResults.every(x => x.selected) })))}
                    className="text-gold-500 text-xs hover:text-gold-400 ml-1">
                    {batchResults.every(r => r.selected) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {batchResults.map((r, i) => (
                  <div key={i} className={cn('flex items-center gap-3 p-3 rounded-xl border', r.status === 'error' ? 'border-red-500/30 bg-red-500/5' : 'border-verse-border bg-verse-bg')}>
                    {r.status === 'complete' && <input type="checkbox" checked={r.selected} onChange={() => { const n = [...batchResults]; n[i].selected = !n[i].selected; setBatchResults(n); }}
                      className="w-4 h-4 rounded border-verse-border bg-verse-bg text-gold-500 focus:ring-gold-500" />}
                    {r.status === 'error' && <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                    <div className="flex-1 min-w-0"><p className="text-verse-text text-sm font-medium truncate">{r.title || r.url}</p><p className="text-verse-muted text-xs">{r.status === 'complete' ? r.sections.length + ' sections' : r.error || r.status}</p></div>
                    {r.status === 'complete' && <button type="button" onClick={() => setPreviewIdx(i)} className="text-gold-500 text-xs hover:text-gold-400 flex-shrink-0">Preview</button>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========== PREVIEW (batch detail) ========== */}
          {step === 'preview' && mode === 'batch' && previewIdx !== null && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => setPreviewIdx(null)} className="text-gold-500 text-sm hover:text-gold-400">{'\u2190'} Back to results</button>
                <ExportMenu title={batchResults[previewIdx].title} artist={batchResults[previewIdx].artist} sections={batchResults[previewIdx].sections} lyrics={batchResults[previewIdx].lyrics} />
              </div>
              <h3 className="text-verse-text font-medium">{batchResults[previewIdx].title}</h3>
              <div className="h-64 overflow-y-auto px-4 py-3 bg-verse-bg rounded-xl border border-verse-border">{renderSections(batchResults[previewIdx].sections, batchResults[previewIdx].lyrics)}</div>
            </div>
          )}

          {/* ========== COMPLETE ========== */}
          {step === 'complete' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-8 h-8 text-green-500" /></div>
              <h3 className="text-verse-text text-lg font-semibold mb-1">{mode === 'batch' ? 'Songs Imported!' : 'Song Imported!'}</h3>
              <p className="text-verse-muted text-sm mb-6">{mode === 'batch' ? batchResults.filter(r => r.selected && r.status === 'complete').length + ' songs added to your library.' : '"' + title + '" has been added to your library.'}</p>
              <button type="button" onClick={handleClose} className="px-6 py-2.5 bg-gold-500 text-black rounded-lg font-medium hover:bg-gold-400 transition-colors">Done</button>
            </div>
          )}
        </div>

        {/* FOOTER */}
        {step !== 'complete' && (
          <div className="px-5 py-4 border-t border-verse-border flex justify-between items-center flex-shrink-0">
            <button type="button" onClick={handleClose} className="px-4 py-2 text-verse-muted hover:text-verse-text transition-colors text-sm">Cancel</button>
            <div className="flex items-center gap-3">
              {step === 'preview' && mode === 'single' && <button type="button" onClick={() => { setStep('input'); setError(null); }} className="px-4 py-2 border border-verse-border text-verse-muted hover:text-verse-text rounded-lg text-sm transition-colors">Back</button>}
              {step === 'input' && (
                <button type="button" onClick={handleProcess} disabled={!canProcess}
                  className={cn('flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-colors', canProcess ? 'bg-gold-500 text-black hover:bg-gold-400' : 'bg-verse-border text-verse-muted cursor-not-allowed')}>
                  {processButtonText}
                </button>
              )}
              {step === 'preview' && mode === 'single' && <button type="button" onClick={handleSave} className="flex items-center gap-2 px-5 py-2.5 bg-gold-500 text-black rounded-lg font-medium text-sm hover:bg-gold-400 transition-colors"><Save className="w-4 h-4" /> Save to Library</button>}
              {step === 'preview' && mode === 'batch' && previewIdx === null && <button type="button" onClick={handleBatchSave} className="flex items-center gap-2 px-5 py-2.5 bg-gold-500 text-black rounded-lg font-medium text-sm hover:bg-gold-400 transition-colors"><Save className="w-4 h-4" /> Save {batchResults.filter(r => r.selected && r.status === 'complete').length} Songs</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default YouTubeImportModal;
