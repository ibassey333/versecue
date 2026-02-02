import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import type { SongSection } from '@/types';

const VOCAB: Record<string, string> = {
  ig: `IGBO CORRECTIONS (apply these substitutions):
- Himera OR Himela OR Himbella -> Imela
- O kaka OR Akaka -> Okaka
- O ye keroa OR Oyekeru OR Oye Keruwa -> Onyekeruwa
- Heze mou OR Eze mo -> Eze mo
- Chukwu, Chineke, Ekene diri gi, Onyedikagi, Onye ne mema, Nara ekele, Onye nagworia`,
  yo: `YORUBA CORRECTIONS: Oluwa, Olorun, Baba, Jesu, Kabiyesi, Oba, Eledumare, Mo dupe, Ogo`,
  ha: `HAUSA CORRECTIONS: Ubangiji, Yesu, Yabo, Godiya, Sarki`,
  sw: `SWAHILI CORRECTIONS: Mungu, Bwana, Yesu, Asante, Sifa, Utukufu, Mfalme`,
};

const VALID_TYPES = ['verse', 'chorus', 'bridge', 'pre-chorus', 'outro', 'intro', 'tag', 'other'];

function buildPrompt(languages: string[]): string {
  const vocabParts = languages
    .filter((l) => l !== 'auto' && l !== 'en' && VOCAB[l])
    .map((l) => VOCAB[l]);

  return `You are a worship lyrics formatter. You take raw transcription text and organize it into labeled sections.

CRITICAL RULES:
1. PRESERVE EVERY SINGLE WORD from the input. Do NOT summarize, shorten, or remove any words.
2. Only fix obvious transcription spelling errors using the vocabulary list below.
3. Add line breaks (\\n) so each line has roughly 5-9 words. Break at natural phrase boundaries.
4. Group lines into sections: verse, chorus, bridge, pre-chorus, intro, outro, other.
5. Repeated sections = "chorus". Sequential unique sections = "verse" (numbered).
6. If the song switches language, note it in the label: "Chorus - Igbo"

${vocabParts.length > 0 ? 'SPELLING CORRECTIONS TO APPLY:\n' + vocabParts.join('\n') : ''}

IMPORTANT:
- Do NOT remove words or phrases
- Do NOT summarize or paraphrase
- Do NOT add translations in parentheses
- Do NOT add words that aren't in the original
- ONLY fix spelling errors from the vocabulary list above
- The output lyrics should contain ALL the same words as the input, just with line breaks and section labels added

Return ONLY this JSON (no markdown, no backticks):
{"sections":[{"type":"verse","label":"Verse 1","lyrics":"When I think upon Your goodness\\nAnd Your faithfulness each day\\nI am convinced it is not because\\nI am worthy to receive\\nThe kind of love that You give","order":1}],"correctionsMade":["Himbella -> Imela"]}`;
}

function normalizeType(t: unknown): string {
  if (typeof t !== 'string') return 'other';
  const lower = t.toLowerCase().trim();
  if (VALID_TYPES.includes(lower)) return lower;
  if (lower.includes('chorus') || lower === 'refrain') return 'chorus';
  if (lower.includes('verse')) return 'verse';
  if (lower.includes('bridge')) return 'bridge';
  if (lower.includes('pre')) return 'pre-chorus';
  if (lower.includes('outro')) return 'outro';
  if (lower.includes('intro')) return 'intro';
  return 'other';
}

function getCI(obj: Record<string, unknown>, key: string): unknown {
  if (obj[key] !== undefined) return obj[key];
  const lower = key.toLowerCase();
  for (const k of Object.keys(obj)) {
    if (k.toLowerCase() === lower) return obj[k];
  }
  return undefined;
}

function cleanResponse(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  return s.trim();
}

// Ensure no line exceeds maxWords — split at natural points if needed
function enforceLineLength(text: string, maxWords: number = 9): string {
  return text
    .split('\n')
    .flatMap((line) => {
      const words = line.trim().split(/\s+/).filter(w => w.length > 0);
      if (words.length <= maxWords) return [line.trim()];
      const lines: string[] = [];
      let current: string[] = [];
      for (const word of words) {
        current.push(word);
        if (current.length >= maxWords) {
          lines.push(current.join(' '));
          current = [];
        }
      }
      if (current.length > 0) lines.push(current.join(' '));
      return lines;
    })
    .filter((l) => l.trim().length > 0)
    .join('\n');
}

function parseSections(raw: string): { sections: SongSection[]; corrections: string[] } {
  const cleaned = cleanResponse(raw);
  console.log('[Format] Cleaned (first 300):', cleaned.slice(0, 300));

  // Strategy 1: {sections: [...]}
  try {
    const i = cleaned.indexOf('{');
    const j = cleaned.lastIndexOf('}');
    if (i >= 0 && j > i) {
      const parsed = JSON.parse(cleaned.slice(i, j + 1)) as Record<string, unknown>;
      const arr = getCI(parsed, 'sections') as Record<string, unknown>[];
      if (Array.isArray(arr) && arr.length > 0) {
        console.log('[Format] Strategy 1: sections object, count:', arr.length);
        const sections = arr.map((s, idx) => ({
          type: normalizeType(getCI(s, 'type')) as SongSection['type'],
          label: (getCI(s, 'label') as string) || `Section ${idx + 1}`,
          lyrics: enforceLineLength(((getCI(s, 'lyrics') as string) || '').replace(/\\n/g, '\n')),
          order: (getCI(s, 'order') as number) || idx + 1,
        }));
        return { sections, corrections: ((getCI(parsed, 'correctionsMade') as string[]) || []) };
      }
    }
  } catch (e) { console.log('[Format] Strategy 1 fail:', (e as Error).message); }

  // Strategy 2: flat array
  try {
    const i = cleaned.indexOf('[');
    const j = cleaned.lastIndexOf(']');
    if (i >= 0 && j > i) {
      const arr = JSON.parse(cleaned.slice(i, j + 1)) as Record<string, unknown>[];
      if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'object') {
        console.log('[Format] Strategy 2: flat array, count:', arr.length);
        const sections = arr.map((s, idx) => ({
          type: normalizeType(getCI(s, 'type')) as SongSection['type'],
          label: (getCI(s, 'label') as string) || `Section ${idx + 1}`,
          lyrics: enforceLineLength(((getCI(s, 'lyrics') as string) || '').replace(/\\n/g, '\n')),
          order: (getCI(s, 'order') as number) || idx + 1,
        }));
        return { sections, corrections: [] };
      }
    }
  } catch (e) { console.log('[Format] Strategy 2 fail:', (e as Error).message); }

  // Strategy 3: [Label] markers
  const sections: SongSection[] = [];
  const pattern = /\[([^\]]+)\]\s*([\s\S]*?)(?=\[[^\]]+\]|$)/g;
  let match; let order = 1;
  while ((match = pattern.exec(raw)) !== null) {
    const label = match[1].trim();
    const lyrics = match[2].trim();
    if (lyrics) {
      sections.push({ type: normalizeType(label) as SongSection['type'], label, lyrics: enforceLineLength(lyrics), order: order++ });
    }
  }
  if (sections.length > 0) return { sections, corrections: [] };

  // Strategy 4: raw split
  if (!raw.trim()) return { sections: [], corrections: [] };
  const lines = enforceLineLength(raw.trim()).split('\n');
  const result: SongSection[] = [];
  for (let i = 0; i < lines.length; i += 4) {
    result.push({ type: 'verse', label: `Verse ${result.length + 1}`, lyrics: lines.slice(i, Math.min(i + 4, lines.length)).join('\n'), order: result.length + 1 });
  }
  return { sections: result, corrections: [] };
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    const { lyrics, languages = ['auto'], title, artist } = await request.json();
    if (!lyrics?.trim()) return NextResponse.json({ error: 'No lyrics' }, { status: 400 });

    const groq = new Groq({ apiKey });
    let context = '';
    if (title) context += `Song: ${title}\n`;
    if (artist) context += `Artist: ${artist}\n`;
    const langNames = languages.filter((l: string) => l !== 'auto');
    if (langNames.length > 0) context += `Languages: ${langNames.join(', ')}\n`;

    console.log(`[Format] langs=${languages.join(',')}, text=${lyrics.length} chars`);

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: buildPrompt(languages) },
        { role: 'user', content: `${context}\nRaw transcription (preserve ALL words, only add formatting):\n${lyrics}` },
      ],
      temperature: 0.1,
      max_tokens: 8000,
    });

    const content = response.choices[0]?.message?.content || '';
    console.log(`[Format] Response: ${content.length} chars`);

    const { sections, corrections } = parseSections(content);
    console.log(`[Format] Result: ${sections.length} sections, ${corrections.length} corrections`);

    let suggestedTitle = title, suggestedArtist = artist;
    try {
      const c = cleanResponse(content);
      const i = c.indexOf('{'), j = c.lastIndexOf('}');
      if (i >= 0 && j > i) {
        const p = JSON.parse(c.slice(i, j + 1)) as Record<string, unknown>;
        if (!title) suggestedTitle = (getCI(p, 'suggestedTitle') as string) || null;
        if (!artist) suggestedArtist = (getCI(p, 'suggestedArtist') as string) || null;
      }
    } catch {}

    return NextResponse.json({ sections, suggestedTitle, suggestedArtist, corrections });
  } catch (error) {
    console.error('[Format] Error:', error);
    return NextResponse.json({ error: 'Failed', message: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
