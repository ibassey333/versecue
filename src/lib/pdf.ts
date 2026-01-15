// ============================================
// Premium PDF Generator
// Professional sermon notes with elegant design
// ============================================

import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { SessionData, ScriptureNote } from './sessions';

// Initialize pdfMake with fonts
(pdfMake as any).vfs = (pdfFonts as any).pdfMake?.vfs || pdfFonts;

// Premium color palette
const colors = {
  primary: '#1a365d',      // Deep navy blue
  secondary: '#744210',    // Warm brown/gold
  accent: '#c6a962',       // Muted gold
  text: '#2d3748',         // Dark gray
  muted: '#718096',        // Medium gray
  light: '#f7fafc',        // Off white
  divider: '#e2e8f0',      // Light gray
};

export interface PremiumSessionData extends SessionData {
  themes?: string[];
  application_points?: string[];
  quotable_quotes?: string[];
}

export function generatePremiumPDF(session: PremiumSessionData): void {
  const formattedDate = new Date(session.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const docDefinition: any = {
    pageSize: 'LETTER',
    pageMargins: [60, 80, 60, 60],
    
    // Header on every page
    header: (currentPage: number, pageCount: number) => {
      if (currentPage === 1) return null;
      return {
        columns: [
          {
            text: session.title,
            style: 'headerText',
            margin: [60, 30, 0, 0],
          },
          {
            text: `Page ${currentPage} of ${pageCount}`,
            alignment: 'right',
            style: 'headerText',
            margin: [0, 30, 60, 0],
          },
        ],
      };
    },
    
    // Footer on every page
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        {
          text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          alignment: 'center',
          color: colors.divider,
          margin: [60, 0, 60, 5],
        },
      ],
    }),
    
    content: [
      // ============================================
      // TITLE SECTION
      // ============================================
      {
        text: session.title,
        style: 'title',
        margin: [0, 0, 0, 8],
      },
      {
        canvas: [
          {
            type: 'line',
            x1: 0, y1: 0,
            x2: 495, y2: 0,
            lineWidth: 2,
            lineColor: colors.accent,
          },
        ],
        margin: [0, 0, 0, 15],
      },
      {
        columns: [
          {
            text: formattedDate,
            style: 'subtitle',
          },
          {
            text: `${session.duration_minutes} minutes  •  ${session.scriptures.length} scriptures`,
            style: 'subtitle',
            alignment: 'right',
          },
        ],
        margin: [0, 0, 0, 30],
      },
      
      // ============================================
      // THEMES (if available)
      // ============================================
      ...(session.themes && session.themes.length > 0 ? [
        {
          columns: session.themes.map((theme: string) => ({
            text: theme,
            style: 'themeTag',
            alignment: 'center',
            margin: [5, 0, 5, 0],
          })),
          margin: [0, 0, 0, 30],
        },
      ] : []),
      
      // ============================================
      // SUMMARY SECTION
      // ============================================
      {
        text: 'Summary',
        style: 'sectionHeader',
      },
      {
        canvas: [
          {
            type: 'line',
            x1: 0, y1: 0,
            x2: 80, y2: 0,
            lineWidth: 3,
            lineColor: colors.accent,
          },
        ],
        margin: [0, 5, 0, 15],
      },
      {
        text: session.summary,
        style: 'bodyText',
        margin: [0, 0, 0, 30],
      },
      
      // ============================================
      // KEY POINTS SECTION
      // ============================================
      {
        text: 'Key Points',
        style: 'sectionHeader',
      },
      {
        canvas: [
          {
            type: 'line',
            x1: 0, y1: 0,
            x2: 80, y2: 0,
            lineWidth: 3,
            lineColor: colors.accent,
          },
        ],
        margin: [0, 5, 0, 15],
      },
      ...session.key_points.map((point: string, index: number) => ({
        columns: [
          {
            width: 30,
            text: `${index + 1}`,
            style: 'pointNumber',
          },
          {
            width: '*',
            text: point,
            style: 'pointText',
          },
        ],
        margin: [0, 0, 0, 12],
      })),
      
      // ============================================
      // APPLICATION POINTS (if available)
      // ============================================
      ...(session.application_points && session.application_points.length > 0 ? [
        {
          text: '',
          margin: [0, 20, 0, 0],
        },
        {
          text: 'Application',
          style: 'sectionHeader',
        },
        {
          canvas: [
            {
              type: 'line',
              x1: 0, y1: 0,
              x2: 80, y2: 0,
              lineWidth: 3,
              lineColor: colors.accent,
            },
          ],
          margin: [0, 5, 0, 15],
        },
        ...session.application_points.map((point: string) => ({
          columns: [
            {
              width: 20,
              text: '→',
              style: 'applicationArrow',
            },
            {
              width: '*',
              text: point,
              style: 'applicationText',
            },
          ],
          margin: [0, 0, 0, 10],
        })),
      ] : []),
      
      // ============================================
      // QUOTABLE QUOTES (if available)
      // ============================================
      ...(session.quotable_quotes && session.quotable_quotes.length > 0 ? [
        {
          text: '',
          margin: [0, 20, 0, 0],
        },
        {
          text: 'Memorable Quotes',
          style: 'sectionHeader',
        },
        {
          canvas: [
            {
              type: 'line',
              x1: 0, y1: 0,
              x2: 80, y2: 0,
              lineWidth: 3,
              lineColor: colors.accent,
            },
          ],
          margin: [0, 5, 0, 15],
        },
        ...session.quotable_quotes.map((quote: string) => ({
          text: `"${quote}"`,
          style: 'quoteText',
          margin: [20, 0, 20, 15],
        })),
      ] : []),
      
      // ============================================
      // SCRIPTURES SECTION
      // ============================================
      {
        text: '',
        pageBreak: 'before',
      },
      {
        text: `Scripture References (${session.scriptures.length})`,
        style: 'sectionHeader',
      },
      {
        canvas: [
          {
            type: 'line',
            x1: 0, y1: 0,
            x2: 80, y2: 0,
            lineWidth: 3,
            lineColor: colors.accent,
          },
        ],
        margin: [0, 5, 0, 20],
      },
      ...session.scriptures.map((scripture: ScriptureNote) => ([
        {
          text: scripture.reference,
          style: 'scriptureRef',
          margin: [0, 0, 0, 5],
        },
        {
          text: scripture.verse_text 
            ? `"${scripture.verse_text.length > 200 ? scripture.verse_text.substring(0, 200) + '...' : scripture.verse_text}"`
            : '',
          style: 'scriptureText',
          margin: [0, 0, 0, 15],
        },
      ])).flat(),
      
      // ============================================
      // FOOTER BRANDING
      // ============================================
      {
        text: '',
        margin: [0, 40, 0, 0],
      },
      {
        canvas: [
          {
            type: 'line',
            x1: 150, y1: 0,
            x2: 345, y2: 0,
            lineWidth: 1,
            lineColor: colors.divider,
          },
        ],
        margin: [0, 0, 0, 15],
      },
      {
        text: 'Generated by VerseCue',
        style: 'branding',
        alignment: 'center',
      },
      {
        text: 'Real-time Scripture Detection for Churches',
        style: 'tagline',
        alignment: 'center',
      },
    ],
    
    // ============================================
    // STYLES
    // ============================================
    styles: {
      title: {
        fontSize: 28,
        bold: true,
        color: colors.primary,
        font: 'Roboto',
      },
      subtitle: {
        fontSize: 11,
        color: colors.muted,
        italics: true,
      },
      headerText: {
        fontSize: 9,
        color: colors.muted,
      },
      themeTag: {
        fontSize: 10,
        color: colors.secondary,
        bold: true,
      },
      sectionHeader: {
        fontSize: 16,
        bold: true,
        color: colors.primary,
        margin: [0, 0, 0, 0],
      },
      bodyText: {
        fontSize: 11,
        color: colors.text,
        lineHeight: 1.6,
        alignment: 'justify',
      },
      pointNumber: {
        fontSize: 14,
        bold: true,
        color: colors.accent,
      },
      pointText: {
        fontSize: 11,
        color: colors.text,
        lineHeight: 1.5,
      },
      applicationArrow: {
        fontSize: 14,
        color: colors.secondary,
        bold: true,
      },
      applicationText: {
        fontSize: 11,
        color: colors.text,
        italics: true,
        lineHeight: 1.4,
      },
      quoteText: {
        fontSize: 12,
        color: colors.secondary,
        italics: true,
        lineHeight: 1.5,
        alignment: 'center',
      },
      scriptureRef: {
        fontSize: 12,
        bold: true,
        color: colors.secondary,
      },
      scriptureText: {
        fontSize: 10,
        color: colors.muted,
        italics: true,
        lineHeight: 1.4,
      },
      branding: {
        fontSize: 12,
        bold: true,
        color: colors.primary,
      },
      tagline: {
        fontSize: 9,
        color: colors.muted,
        italics: true,
        margin: [0, 3, 0, 0],
      },
    },
    
    defaultStyle: {
      font: 'Roboto',
    },
  };
  
  // Generate and download
  pdfMake.createPdf(docDefinition).download(
    `${session.title.replace(/[^a-z0-9]/gi, '_')}.pdf`
  );
}

// Also export a simpler version for backward compatibility
export function generatePDF(session: SessionData): void {
  generatePremiumPDF(session as PremiumSessionData);
}
