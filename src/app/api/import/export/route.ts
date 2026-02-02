import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface ExportSection {
  type: string;
  label: string;
  lyrics: string;
  order: number;
}

export async function POST(request: NextRequest) {
  try {
    const { format, title, artist, sections } = await request.json() as {
      format: 'docx' | 'pdf';
      title: string;
      artist: string;
      sections: ExportSection[];
    };

    if (format === 'docx') {
      return generateDocx(title, artist, sections);
    } else if (format === 'pdf') {
      return generatePdf(title, artist, sections);
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  } catch (error) {
    console.error('[Export] Error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

async function generateDocx(title: string, artist: string, sections: ExportSection[]) {
  const children: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 48, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: artist, italics: true, size: 24, color: '666666', font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  ];

  for (const section of sections) {
    // Section label
    children.push(new Paragraph({
      children: [new TextRun({ text: `[${section.label}]`, bold: true, size: 22, color: 'B8860B', font: 'Calibri' })],
      spacing: { before: 300, after: 100 },
    }));

    // Lyrics lines
    for (const line of section.lyrics.split('\n')) {
      children.push(new Paragraph({
        children: [new TextRun({ text: line, size: 24, font: 'Calibri' })],
        spacing: { after: 60 },
      }));
    }
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
      },
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${title}.docx"`,
    },
  });
}

async function generatePdf(title: string, artist: string, sections: ExportSection[]) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageW = 612, pageH = 792;
  const margin = 72;
  const lineH = 18;
  let page = pdfDoc.addPage([pageW, pageH]);
  let y = pageH - margin;

  const addPage = () => {
    page = pdfDoc.addPage([pageW, pageH]);
    y = pageH - margin;
  };

  const drawText = (text: string, f: typeof font, size: number, color = rgb(0, 0, 0), centered = false) => {
    if (y < margin + lineH) addPage();
    const w = f.widthOfTextAtSize(text, size);
    const x = centered ? (pageW - w) / 2 : margin;
    page.drawText(text, { x, y, size, font: f, color });
    y -= size + 6;
  };

  // Title
  drawText(title, bold, 24, rgb(0, 0, 0), true);
  drawText(artist, font, 14, rgb(0.4, 0.4, 0.4), true);
  y -= 20;

  for (const section of sections) {
    if (y < margin + 60) addPage();
    y -= 10;
    drawText(`[${section.label}]`, bold, 11, rgb(0.72, 0.53, 0.04));
    for (const line of section.lyrics.split('\n')) {
      if (line.trim()) drawText(line, font, 12);
    }
  }

  const bytes = await pdfDoc.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${title}.pdf"`,
    },
  });
}
