// Song Import Parsers
// Supports: ProPresenter, EasyWorship, OpenLP, OpenSong, CCLI, ChordPro, Plain Text

export interface ParsedSong {
  title: string;
  artist: string;
  lyrics: string;
  copyright?: string;
  ccliNumber?: string;
  key?: string;
  tempo?: string;
  tags?: string[];
}

export interface ImportResult {
  success: boolean;
  songs: ParsedSong[];
  errors: string[];
  format: string;
}

// ============================================
// ProPresenter Parser (.pro, .pro5, .pro6, .pro7)
// ============================================
export function parseProPresenter(content: string, filename: string): ParsedSong | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/xml');
    
    // ProPresenter 5/6 format
    const root = doc.querySelector('RVPresentationDocument') || doc.querySelector('RVSongDocument');
    
    if (!root) {
      // Try ProPresenter 7 format
      return parseProPresenter7(content, filename);
    }
    
    const title = root.getAttribute('CCLISongTitle') || 
                  root.getAttribute('label') || 
                  filename.replace(/\.pro\d?$/i, '');
    
    const artist = root.getAttribute('CCLIArtistCredits') || 
                   root.getAttribute('artist') || 
                   'Unknown';
    
    const ccliNumber = root.getAttribute('CCLISongNumber') || undefined;
    const copyright = root.getAttribute('CCLICopyrightInfo') || undefined;
    
    // Extract slides/lyrics
    const slides = doc.querySelectorAll('RVDisplaySlide, RVTextElement');
    const lyricsArray: string[] = [];
    
    slides.forEach((slide) => {
      // Get RTF or plain text content
      const textElement = slide.querySelector('RVTextElement') || slide;
      const rtfData = textElement.getAttribute('RTFData');
      
      if (rtfData) {
        // Decode base64 RTF and extract plain text
        try {
          const decoded = atob(rtfData);
          const plainText = extractTextFromRTF(decoded);
          if (plainText.trim()) {
            lyricsArray.push(plainText.trim());
          }
        } catch {
          // Try direct text
          const text = textElement.textContent?.trim();
          if (text) lyricsArray.push(text);
        }
      }
    });
    
    return {
      title,
      artist,
      lyrics: lyricsArray.join('\n\n'),
      ccliNumber,
      copyright,
    };
  } catch (error) {
    console.error('ProPresenter parse error:', error);
    return null;
  }
}

function parseProPresenter7(content: string, filename: string): ParsedSong | null {
  try {
    // ProPresenter 7 uses a different JSON-like structure
    const data = JSON.parse(content);
    
    const title = data.name || data.ccli?.songTitle || filename;
    const artist = data.ccli?.artistCredits || 'Unknown';
    
    const slides = data.slides || data.cues || [];
    const lyricsArray: string[] = [];
    
    slides.forEach((slide: any) => {
      const text = slide.text || slide.label || '';
      if (text.trim()) {
        lyricsArray.push(text.trim());
      }
    });
    
    return {
      title,
      artist,
      lyrics: lyricsArray.join('\n\n'),
      ccliNumber: data.ccli?.songNumber,
      copyright: data.ccli?.copyrightYear,
    };
  } catch {
    return null;
  }
}

// ============================================
// OpenSong Parser (.xml)
// ============================================
export function parseOpenSong(content: string, filename: string): ParsedSong | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/xml');
    
    const song = doc.querySelector('song');
    if (!song) return null;
    
    const title = song.querySelector('title')?.textContent || filename;
    const artist = song.querySelector('author')?.textContent || 
                   song.querySelector('artist')?.textContent || 
                   'Unknown';
    
    const lyricsRaw = song.querySelector('lyrics')?.textContent || '';
    
    // OpenSong format: [V1], [C], etc. for sections
    // Lines starting with space are lyrics, lines starting with . are chords
    const lines = lyricsRaw.split('\n');
    const lyricsArray: string[] = [];
    let currentSection: string[] = [];
    
    lines.forEach((line) => {
      if (line.startsWith('[')) {
        // New section
        if (currentSection.length > 0) {
          lyricsArray.push(currentSection.join('\n'));
          currentSection = [];
        }
      } else if (line.startsWith(' ') || line.startsWith('\t')) {
        // Lyrics line (indented)
        currentSection.push(line.trim());
      } else if (!line.startsWith('.') && line.trim()) {
        // Not a chord line
        currentSection.push(line.trim());
      }
    });
    
    if (currentSection.length > 0) {
      lyricsArray.push(currentSection.join('\n'));
    }
    
    return {
      title,
      artist,
      lyrics: lyricsArray.join('\n\n'),
      key: song.querySelector('key')?.textContent || undefined,
      tempo: song.querySelector('tempo')?.textContent || undefined,
      ccliNumber: song.querySelector('ccli')?.textContent || undefined,
      copyright: song.querySelector('copyright')?.textContent || undefined,
    };
  } catch (error) {
    console.error('OpenSong parse error:', error);
    return null;
  }
}

// ============================================
// CCLI SongSelect Parser (.txt, .usr)
// ============================================
export function parseCCLI(content: string, filename: string): ParsedSong | null {
  try {
    const lines = content.split('\n');
    let title = filename.replace(/\.(txt|usr)$/i, '');
    let artist = 'Unknown';
    let ccliNumber = '';
    let copyright = '';
    const lyricsArray: string[] = [];
    let inLyrics = false;
    let currentSection: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // CCLI format headers
      if (trimmed.startsWith('Title:')) {
        title = trimmed.replace('Title:', '').trim();
      } else if (trimmed.startsWith('Author:') || trimmed.startsWith('Artist:')) {
        artist = trimmed.replace(/^(Author|Artist):/, '').trim();
      } else if (trimmed.startsWith('CCLI Song #') || trimmed.startsWith('CCLI #')) {
        ccliNumber = trimmed.replace(/^CCLI (Song )?#:?/, '').trim();
      } else if (trimmed.startsWith('©') || trimmed.startsWith('Copyright')) {
        copyright = trimmed;
      } else if (trimmed.match(/^(Verse|Chorus|Bridge|Pre-Chorus|Tag|Outro|Intro|Ending)\s*\d*/i)) {
        // Section header
        if (currentSection.length > 0) {
          lyricsArray.push(currentSection.join('\n'));
          currentSection = [];
        }
        inLyrics = true;
      } else if (inLyrics && trimmed) {
        currentSection.push(trimmed);
      } else if (trimmed === '' && currentSection.length > 0) {
        lyricsArray.push(currentSection.join('\n'));
        currentSection = [];
      }
    }
    
    if (currentSection.length > 0) {
      lyricsArray.push(currentSection.join('\n'));
    }
    
    // If no structured lyrics found, treat whole content as lyrics
    if (lyricsArray.length === 0) {
      const plainLyrics = lines
        .filter(l => !l.match(/^(Title|Author|Artist|CCLI|©|Copyright):/i))
        .join('\n')
        .trim();
      if (plainLyrics) {
        lyricsArray.push(plainLyrics);
      }
    }
    
    return {
      title,
      artist,
      lyrics: lyricsArray.join('\n\n'),
      ccliNumber: ccliNumber || undefined,
      copyright: copyright || undefined,
    };
  } catch (error) {
    console.error('CCLI parse error:', error);
    return null;
  }
}

// ============================================
// ChordPro Parser (.cho, .chopro, .chordpro)
// ============================================
export function parseChordPro(content: string, filename: string): ParsedSong | null {
  try {
    let title = filename.replace(/\.(cho|chopro|chordpro)$/i, '');
    let artist = 'Unknown';
    let key = '';
    const lyricsArray: string[] = [];
    let currentSection: string[] = [];
    
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // ChordPro directives {directive: value}
      const directive = trimmed.match(/^\{(\w+):\s*(.+)\}$/);
      if (directive) {
        const [, cmd, value] = directive;
        switch (cmd.toLowerCase()) {
          case 'title':
          case 't':
            title = value;
            break;
          case 'artist':
          case 'a':
          case 'composer':
            artist = value;
            break;
          case 'key':
            key = value;
            break;
        }
        continue;
      }
      
      // Section markers
      if (trimmed.match(/^\{(soc|start_of_chorus|sov|start_of_verse|sob|start_of_bridge)\}/i)) {
        if (currentSection.length > 0) {
          lyricsArray.push(currentSection.join('\n'));
          currentSection = [];
        }
        continue;
      }
      
      if (trimmed.match(/^\{(eoc|end_of_chorus|eov|end_of_verse|eob|end_of_bridge)\}/i)) {
        if (currentSection.length > 0) {
          lyricsArray.push(currentSection.join('\n'));
          currentSection = [];
        }
        continue;
      }
      
      // Skip other directives
      if (trimmed.startsWith('{')) continue;
      
      // Remove chord notations [Chord]
      const lyricsLine = trimmed.replace(/\[[^\]]+\]/g, '').trim();
      if (lyricsLine) {
        currentSection.push(lyricsLine);
      } else if (currentSection.length > 0 && trimmed === '') {
        lyricsArray.push(currentSection.join('\n'));
        currentSection = [];
      }
    }
    
    if (currentSection.length > 0) {
      lyricsArray.push(currentSection.join('\n'));
    }
    
    return {
      title,
      artist,
      lyrics: lyricsArray.join('\n\n'),
      key: key || undefined,
    };
  } catch (error) {
    console.error('ChordPro parse error:', error);
    return null;
  }
}

// ============================================
// Plain Text Parser (.txt)
// ============================================
export function parsePlainText(content: string, filename: string): ParsedSong | null {
  try {
    const title = filename.replace(/\.txt$/i, '');
    
    // Try to detect structure
    const lines = content.split('\n');
    let artist = 'Unknown';
    let lyricsStart = 0;
    
    // Check if first lines contain metadata
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();
      if (line.toLowerCase().startsWith('by ') || line.toLowerCase().startsWith('artist:')) {
        artist = line.replace(/^(by |artist:\s*)/i, '').trim();
        lyricsStart = i + 1;
      }
    }
    
    // Split by double newlines for sections
    const lyrics = lines.slice(lyricsStart).join('\n').trim();
    
    return {
      title,
      artist,
      lyrics,
    };
  } catch (error) {
    console.error('Plain text parse error:', error);
    return null;
  }
}

// ============================================
// RTF Text Extractor (for ProPresenter)
// ============================================
function extractTextFromRTF(rtf: string): string {
  // Simple RTF to plain text - removes RTF formatting
  let text = rtf
    .replace(/\\par[d]?/g, '\n')
    .replace(/\{\\[^{}]+\}/g, '')
    .replace(/\\[a-z]+\d*\s?/gi, '')
    .replace(/[{}]/g, '')
    .replace(/\\'/g, "'")
    .trim();
  
  // Clean up multiple newlines
  text = text.replace(/\n{3,}/g, '\n\n');
  
  return text;
}

// ============================================
// Main Import Function
// ============================================
export async function importSongFile(file: File): Promise<ImportResult> {
  const filename = file.name;
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const errors: string[] = [];
  const songs: ParsedSong[] = [];
  let format = 'unknown';
  
  try {
    const content = await file.text();
    let parsed: ParsedSong | null = null;
    
    switch (ext) {
      case 'pro':
      case 'pro5':
      case 'pro6':
      case 'pro7':
        format = 'ProPresenter';
        parsed = parseProPresenter(content, filename);
        break;
        
      case 'osz':
        format = 'OpenLP';
        errors.push('OpenLP .osz files require ZIP extraction - use individual XML files');
        break;
        
      case 'xml':
        format = 'OpenSong';
        parsed = parseOpenSong(content, filename);
        break;
        
      case 'cho':
      case 'chopro':
      case 'chordpro':
        format = 'ChordPro';
        parsed = parseChordPro(content, filename);
        break;
        
      case 'usr':
        format = 'CCLI SongSelect';
        parsed = parseCCLI(content, filename);
        break;
        
      case 'txt':
        // Try CCLI format first, fall back to plain text
        format = 'Text';
        parsed = parseCCLI(content, filename);
        if (!parsed || !parsed.lyrics) {
          parsed = parsePlainText(content, filename);
        }
        break;
        
      default:
        errors.push(`Unsupported file format: .${ext}`);
    }
    
    if (parsed && parsed.lyrics) {
      songs.push(parsed);
    } else if (!errors.length) {
      errors.push(`Could not parse ${filename}`);
    }
    
  } catch (error: any) {
    errors.push(`Error reading ${filename}: ${error.message}`);
  }
  
  return {
    success: songs.length > 0,
    songs,
    errors,
    format,
  };
}

// ============================================
// Batch Import Function
// ============================================
export async function importSongFiles(files: FileList | File[]): Promise<ImportResult> {
  const allSongs: ParsedSong[] = [];
  const allErrors: string[] = [];
  const formats = new Set<string>();
  
  for (const file of Array.from(files)) {
    const result = await importSongFile(file);
    allSongs.push(...result.songs);
    allErrors.push(...result.errors);
    if (result.format !== 'unknown') {
      formats.add(result.format);
    }
  }
  
  return {
    success: allSongs.length > 0,
    songs: allSongs,
    errors: allErrors,
    format: Array.from(formats).join(', ') || 'unknown',
  };
}
