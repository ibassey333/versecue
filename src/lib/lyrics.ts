// ============================================
// VerseCue Lyrics Processing Utilities
// Premium quality lyric splitting for worship display
// ============================================

/**
 * Represents a display-ready section of lyrics
 * May be a full original section or a part of a split section
 */
export interface DisplaySection {
  /** Unique identifier for this display section */
  id: string;
  /** Index of the original section (before splitting) */
  originalIndex: number;
  /** Part index within the original section (0 if not split) */
  partIndex: number;
  /** Total parts this original section was split into (1 if not split) */
  totalParts: number;
  /** The actual lyrics text to display */
  text: string;
  /** Display label: "1", "2a", "2b", "3", etc. */
  label: string;
  /** Number of lines in this section */
  lineCount: number;
  /** Character count of this section */
  charCount: number;
  /** Whether this is a split part (not a complete original section) */
  isSplitPart: boolean;
}

/**
 * Configuration options for smart splitting
 */
export interface SplitConfig {
  /** Maximum lines per display section before splitting (default: 4) */
  maxLinesPerPart: number;
  /** Maximum characters per display section before splitting (default: 150) */
  maxCharsPerPart: number;
  /** Minimum lines per part - we try to show at least this many (default: 2) */
  minLinesPerPart: number;
  /** Whether auto-split is enabled (default: true). If false, uses original sections without splitting */
  autoSplitEnabled: boolean;
}

const DEFAULT_SPLIT_CONFIG: SplitConfig = {
  maxLinesPerPart: 4,
  maxCharsPerPart: 150,
  minLinesPerPart: 2,
  autoSplitEnabled: true,
};

/**
 * Converts a zero-based part index to a letter suffix (a, b, c, ...)
 */
function getPartLetter(partIndex: number): string {
  return String.fromCharCode(97 + partIndex); // 97 = 'a'
}

/**
 * Determines if a section needs splitting based on line count and character count
 */
function needsSplitting(lines: string[], config: SplitConfig): boolean {
  const lineCount = lines.length;
  const charCount = lines.join('\n').length;
  
  return lineCount > config.maxLinesPerPart || charCount > config.maxCharsPerPart;
}

/**
 * Splits lines into optimal groups respecting the constraints:
 * - Never break a line (lines are atomic)
 * - Try to keep each part under maxCharsPerPart
 * - Try to keep each part at or under maxLinesPerPart
 * - Prefer at least minLinesPerPart per group (but allow 1 if necessary)
 */
function splitIntoGroups(lines: string[], config: SplitConfig): string[][] {
  const groups: string[][] = [];
  let currentGroup: string[] = [];
  let currentCharCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineCharCount = line.length;
    const wouldExceedChars = currentCharCount + lineCharCount + (currentGroup.length > 0 ? 1 : 0) > config.maxCharsPerPart;
    const wouldExceedLines = currentGroup.length >= config.maxLinesPerPart;
    
    // Check if adding this line would exceed limits
    if (currentGroup.length > 0 && (wouldExceedChars || wouldExceedLines)) {
      // Before starting a new group, check if we have enough lines
      // Only start new group if current has at least minLinesPerPart OR
      // we're at the line limit
      if (currentGroup.length >= config.minLinesPerPart || wouldExceedLines) {
        groups.push(currentGroup);
        currentGroup = [];
        currentCharCount = 0;
      }
    }
    
    currentGroup.push(line);
    currentCharCount += lineCharCount + (currentGroup.length > 1 ? 1 : 0); // +1 for newline
  }
  
  // Don't forget the last group
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }
  
  // Post-process: if last group has only 1 line and previous exists with room,
  // we still keep it separate per user preference (show 1 line alone if needed)
  
  return groups;
}

/**
 * Smart split lyrics into display-ready sections
 * 
 * This is the main export - takes raw lyrics and returns an array of
 * DisplaySection objects ready for rendering and navigation.
 * 
 * @param lyrics - Raw lyrics string with sections separated by \n\n
 * @param config - Optional split configuration
 * @returns Array of DisplaySection objects
 */
export function smartSplitLyrics(
  lyrics: string,
  config: Partial<SplitConfig> = {}
): DisplaySection[] {
  const fullConfig: SplitConfig = { ...DEFAULT_SPLIT_CONFIG, ...config };
  
  // Handle empty/null lyrics
  if (!lyrics || !lyrics.trim()) {
    return [];
  }
  
  // Split into original sections by double newline
  const originalSections = lyrics.split(/\n\n+/).filter(Boolean);
  
  // If auto-split is disabled, return original sections without splitting
  if (!fullConfig.autoSplitEnabled) {
    return originalSections.map((sectionText, index) => {
      const trimmedText = sectionText.trim();
      const lines = trimmedText.split('\n').filter(Boolean);
      return {
        id: `section-${index}`,
        originalIndex: index,
        partIndex: 0,
        totalParts: 1,
        text: trimmedText,
        label: `${index + 1}`,
        lineCount: lines.length,
        charCount: trimmedText.length,
        isSplitPart: false,
      };
    });
  }
  
  const displaySections: DisplaySection[] = [];
  let displayIndex = 0;
  
  for (let origIndex = 0; origIndex < originalSections.length; origIndex++) {
    const sectionText = originalSections[origIndex].trim();
    const lines = sectionText.split('\n').filter(Boolean);
    
    // Check if this section needs splitting
    if (needsSplitting(lines, fullConfig)) {
      // Split into multiple parts
      const groups = splitIntoGroups(lines, fullConfig);
      
      for (let partIndex = 0; partIndex < groups.length; partIndex++) {
        const partLines = groups[partIndex];
        const partText = partLines.join('\n');
        
        displaySections.push({
          id: `section-${origIndex}-part-${partIndex}`,
          originalIndex: origIndex,
          partIndex: partIndex,
          totalParts: groups.length,
          text: partText,
          label: `${origIndex + 1}${getPartLetter(partIndex)}`,
          lineCount: partLines.length,
          charCount: partText.length,
          isSplitPart: true,
        });
        
        displayIndex++;
      }
    } else {
      // No splitting needed - single section
      displaySections.push({
        id: `section-${origIndex}`,
        originalIndex: origIndex,
        partIndex: 0,
        totalParts: 1,
        text: sectionText,
        label: `${origIndex + 1}`,
        lineCount: lines.length,
        charCount: sectionText.length,
        isSplitPart: false,
      });
      
      displayIndex++;
    }
  }
  
  return displaySections;
}

/**
 * Simple split for backward compatibility
 * Just splits by \n\n without any smart processing
 */
export function simpleSplitLyrics(lyrics: string): string[] {
  if (!lyrics || !lyrics.trim()) {
    return [];
  }
  return lyrics.split(/\n\n+/).filter(Boolean);
}

/**
 * Get section info for display (e.g., "Part 2 of 3" or "Section 5")
 */
export function getSectionDisplayInfo(section: DisplaySection): string {
  if (section.isSplitPart) {
    return `Part ${section.partIndex + 1} of ${section.totalParts}`;
  }
  return `Section ${section.originalIndex + 1}`;
}

/**
 * Get navigation info string (e.g., "2a / 8" or "3 / 5")
 */
export function getNavigationInfo(
  currentIndex: number,
  sections: DisplaySection[]
): string {
  if (sections.length === 0) return '0 / 0';
  
  const current = sections[currentIndex];
  if (!current) return `${currentIndex + 1} / ${sections.length}`;
  
  return `${current.label} / ${sections.length}`;
}

/**
 * Calculate total original sections count (before splitting)
 */
export function getOriginalSectionCount(sections: DisplaySection[]): number {
  if (sections.length === 0) return 0;
  
  const lastSection = sections[sections.length - 1];
  return lastSection.originalIndex + 1;
}

/**
 * Find the display index for a given original section index
 * Returns the first part if the section was split
 */
export function findDisplayIndexForOriginal(
  sections: DisplaySection[],
  originalIndex: number
): number {
  return sections.findIndex(s => s.originalIndex === originalIndex);
}

/**
 * Group display sections by their original section index
 * Useful for showing in the "Ready to Display" panel
 */
export function groupByOriginalSection(
  sections: DisplaySection[]
): Map<number, DisplaySection[]> {
  const groups = new Map<number, DisplaySection[]>();
  
  for (const section of sections) {
    const existing = groups.get(section.originalIndex) || [];
    existing.push(section);
    groups.set(section.originalIndex, existing);
  }
  
  return groups;
}
