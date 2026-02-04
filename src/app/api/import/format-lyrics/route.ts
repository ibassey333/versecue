import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import type { SongSection } from '@/types';

const VOCAB: Record<string, string> = {
  // African languages
  ig: `IGBO CORRECTIONS:
- Himera/Himela/Himbella -> Imela (thank you)
- O kaka/Akaka -> Okaka (the greatest)
- Oyekeru/Oye Keruwa -> Onyekeruwa (who created all)
- Common: Chukwu, Chineke, Ekene diri gi, Onyedikagi, Nara ekele`,
  yo: `YORUBA CORRECTIONS:
- Common: Oluwa (Lord), Olorun (God), Baba (Father), Jesu, Kabiyesi (King), Oba, Eledumare, Mo dupe (thank you), Ogo (glory)`,
  ha: `HAUSA CORRECTIONS: Ubangiji, Yesu, Yabo, Godiya, Sarki`,
  sw: `SWAHILI CORRECTIONS: Mungu, Bwana, Yesu, Asante, Sifa, Utukufu, Mfalme`,
  pcm: `NIGERIAN PIDGIN CORRECTIONS: Common phrases often transcribed incorrectly - "E no dey" (it's not), "Wetin" (what), "Na God" (it's God)`,
  
  // European languages
  es: `SPANISH WORSHIP CORRECTIONS (Whisper often mishears these):
- "soplando/sobrando" in worship context -> "obrando" (working)
- "ti niegas/ti nieblas" -> "tinieblas" (darkness)
- "as eres" or "así es" at line end -> "así eres tú" (that's how you are)
- Common phrases: "abres camino" (open the way), "cumples promesas" (keep promises), "luz en tinieblas" (light in darkness)
- Terms: Milagroso, Señor, Jesús, Salvador, Espíritu Santo, Gloria, Aleluya, Santo, Cordero, Rey`,
  fr: `FRENCH WORSHIP CORRECTIONS:
- Common: Seigneur (Lord), Jésus, Saint-Esprit, Gloire, Alléluia, Béni (blessed), Louange (praise)
- "L'Éternel" (the Lord), "Tout-Puissant" (Almighty), "Agneau" (Lamb)`,
  pt: `PORTUGUESE WORSHIP CORRECTIONS:
- Common: Senhor, Jesus, Espírito Santo, Glória, Aleluia, Santo, Louvor, Cordeiro, Rei`,
};

const VALID_TYPES = ['verse', 'chorus', 'bridge', 'pre-chorus', 'outro', 'intro', 'tag', 'other'];

function buildPrompt(languages: string[], title?: string, artist?: string): string {
  const vocabParts = languages
    .filter((l) => l !== 'auto' && l !== 'en' && VOCAB[l])
    .map((l) => VOCAB[l]);

  const songHint = title ? `
SONG RECOGNITION:
The song is "${title}"${artist ? ` by ${artist}` : ''}. If you recognize this song, use your knowledge of the correct lyrics to fix transcription errors. Many worship songs are well-known globally (Way Maker, What A Beautiful Name, Goodness of God, 10,000 Reasons, etc.). If this is a known song, correct words to match the actual lyrics.` : '';

  return `You are a worship lyrics formatter and corrector. You take raw transcription from speech-to-text and:
1. Fix transcription errors (mishearings, word boundaries, truncations)
2. Organize into labeled sections (verse, chorus, bridge, etc.)

TRANSCRIPTION ERROR PATTERNS TO FIX:
- Word boundaries: "ti niegas" -> "tinieblas", "how the lieu ya" -> "hallelujah"  
- Similar sounds: "Je over" -> "Jehovah", "a door nigh" -> "Adonai", "soplando" -> "obrando"
- Truncated endings: "as eres t" -> "así eres tú", "hallelu" -> "hallelujah"
- Common terms: Ensure proper spelling of Jesus, Holy Spirit, Lord, God, Hallelujah, Amen, Hosanna, etc.
${songHint}
${vocabParts.length > 0 ? '\nLANGUAGE-SPECIFIC CORRECTIONS:\n' + vocabParts.join('\n\n') : ''}

FORMATTING RULES:
1. Add line breaks (\\n) so each line has roughly 5-9 words. Break at natural phrase boundaries.
2. Group lines into sections: verse, chorus, bridge, pre-chorus, intro, outro, other.
3. Repeated sections = "chorus". Sequential unique sections = "verse" (numbered).
4. If the song switches language mid-song, note it: "Chorus - Spanish"

PRESERVE:
- The overall structure and meaning
- All intended content (don't remove verses or phrases)

DO NOT:
- Add translations in parentheses
- Add words that aren't implied by the transcription
- Summarize or shorten significantly

Return ONLY this JSON (no markdown, no backticks):
{"sections":[{"type":"verse","label":"Verse 1","lyrics":"Line one here\\nLine two here","order":1}],"correctionsMade":["soplando -> obrando","ti niegas -> tinieblas"]}`;
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

    console.log(`[Format] langs=${languages.join(',')}, title="${title || ''}", artist="${artist || ''}", text=${lyrics.length} chars`);

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: buildPrompt(languages, title, artist) },
        { role: 'user', content: `${context}\nRaw transcription to format and correct:\n${lyrics}` },
      ],
      temperature: 0.1,
      max_tokens: 8000,
    });

    const content = response.choices[0]?.message?.content || '';
    console.log(`[Format] Response: ${content.length} chars`);

    const { sections, corrections } = parseSections(content);
    console.log(`[Format] Result: ${sections.length} sections, ${corrections.length} corrections: ${corrections.slice(0, 3).join(', ')}`);

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
