// ============================================
// Beautiful PDF Sermon Notes Generator
// ============================================

import { SessionData } from './sessions';

export function generatePDF(session: SessionData): void {
  // Create printable HTML
  const html = generatePrintHTML(session);
  
  // Open in new window for printing/saving as PDF
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Auto-trigger print dialog after load
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  }
}

function generatePrintHTML(session: SessionData): string {
  const date = new Date(session.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const time = new Date(session.date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  
  const scripturesHTML = session.scriptures.map(s => `
    <div class="scripture-card">
      <div class="scripture-ref">${s.reference}</div>
      <div class="scripture-text">"${s.verse_text}"</div>
    </div>
  `).join('');
  
  const keyPointsHTML = session.key_points.map((point, i) => `
    <div class="key-point">
      <span class="point-number">${i + 1}</span>
      <span class="point-text">${point}</span>
    </div>
  `).join('');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${session.title} - Sermon Notes</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background: white;
      padding: 0;
    }
    
    .page {
      max-width: 800px;
      margin: 0 auto;
      padding: 60px 50px;
    }
    
    /* Header */
    .header {
      text-align: center;
      margin-bottom: 50px;
      padding-bottom: 30px;
      border-bottom: 2px solid #d4af37;
    }
    
    .logo {
      font-family: 'Cormorant Garamond', serif;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: #d4af37;
      margin-bottom: 20px;
    }
    
    .title {
      font-family: 'Cormorant Garamond', serif;
      font-size: 32px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 15px;
    }
    
    .meta {
      font-size: 14px;
      color: #666;
    }
    
    .meta-item {
      display: inline-block;
      margin: 0 15px;
    }
    
    .meta-icon {
      margin-right: 5px;
    }
    
    /* Sections */
    .section {
      margin-bottom: 40px;
    }
    
    .section-title {
      font-family: 'Cormorant Garamond', serif;
      font-size: 20px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e5e5e5;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .section-icon {
      font-size: 18px;
    }
    
    /* Summary */
    .summary-text {
      font-size: 15px;
      line-height: 1.8;
      color: #333;
      text-align: justify;
    }
    
    /* Key Points */
    .key-points {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    
    .key-point {
      display: flex;
      align-items: flex-start;
      gap: 15px;
      padding: 15px 20px;
      background: #fafafa;
      border-radius: 8px;
      border-left: 3px solid #d4af37;
    }
    
    .point-number {
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      background: #d4af37;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 600;
    }
    
    .point-text {
      font-size: 14px;
      color: #333;
      line-height: 1.6;
    }
    
    /* Scriptures */
    .scriptures-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }
    
    .scripture-card {
      padding: 20px;
      background: linear-gradient(135deg, #fdfbf7 0%, #f9f6f0 100%);
      border-radius: 10px;
      border: 1px solid #e8e4dc;
    }
    
    .scripture-ref {
      font-family: 'Cormorant Garamond', serif;
      font-size: 18px;
      font-weight: 700;
      color: #8b7355;
      margin-bottom: 10px;
    }
    
    .scripture-text {
      font-family: 'Cormorant Garamond', serif;
      font-size: 14px;
      font-style: italic;
      color: #555;
      line-height: 1.7;
    }
    
    /* Transcript */
    .transcript-text {
      font-size: 13px;
      line-height: 1.9;
      color: #444;
      text-align: justify;
      column-count: 2;
      column-gap: 40px;
    }
    
    /* Footer */
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      text-align: center;
      font-size: 11px;
      color: #999;
    }
    
    .footer-brand {
      font-family: 'Cormorant Garamond', serif;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 2px;
      color: #d4af37;
    }
    
    /* Print styles */
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      
      .page {
        padding: 40px;
      }
      
      .scripture-card {
        break-inside: avoid;
      }
      
      .key-point {
        break-inside: avoid;
      }
    }
    
    @page {
      margin: 0.5in;
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="logo">✦ VerseCue ✦</div>
      <h1 class="title">Sermon Notes</h1>
      <div class="meta">
        <span class="meta-item"><span class="meta-icon">📅</span>${date}</span>
        <span class="meta-item"><span class="meta-icon">🕐</span>${time}</span>
        <span class="meta-item"><span class="meta-icon">⏱</span>${session.duration_minutes} minutes</span>
        <span class="meta-item"><span class="meta-icon">📖</span>${session.scriptures.length} scriptures</span>
      </div>
    </div>
    
    <!-- Summary -->
    <div class="section">
      <h2 class="section-title"><span class="section-icon">📝</span> Summary</h2>
      <p class="summary-text">${session.summary}</p>
    </div>
    
    <!-- Key Points -->
    ${session.key_points.length > 0 ? `
    <div class="section">
      <h2 class="section-title"><span class="section-icon">🎯</span> Key Points</h2>
      <div class="key-points">
        ${keyPointsHTML}
      </div>
    </div>
    ` : ''}
    
    <!-- Scriptures -->
    ${session.scriptures.length > 0 ? `
    <div class="section">
      <h2 class="section-title"><span class="section-icon">📖</span> Scriptures Referenced</h2>
      <div class="scriptures-grid">
        ${scripturesHTML}
      </div>
    </div>
    ` : ''}
    
    <!-- Full Transcript -->
    <div class="section">
      <h2 class="section-title"><span class="section-icon">🎤</span> Full Transcript</h2>
      <p class="transcript-text">${session.transcript}</p>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="footer-brand">VerseCue</div>
      <p>Generated automatically • The right verse, right on time</p>
    </div>
  </div>
</body>
</html>
  `;
}
