# VerseCue 📖

**AI-Powered Scripture Detection for Worship Services**

VerseCue automatically detects Bible verse references during live sermons and displays them instantly. Never miss a scripture reference again.

![VerseCue Dashboard](./docs/dashboard-preview.png)

## ✨ Features

- **Real-time Speech Recognition** — Captures audio from your mixer or microphone
- **Smart Scripture Detection** — Deterministic parser handles 80%+ of references instantly
- **AI-Powered Context Understanding** — LLM catches implicit references like "Paul's letter about love"
- **Operator Approval Queue** — Human-in-the-loop prevents embarrassing false positives
- **Beautiful Display Output** — Elegant, OBS-compatible projection view
- **Sermon Notes Export** — Markdown/JSON export with AI-generated summaries
- **Keyboard-First Design** — Operators can manage everything without touching the mouse

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Modern browser (Chrome recommended for Web Speech API)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/versecue.git
cd versecue

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Fill in your API keys (see Configuration section)
nano .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the operator dashboard.

### Setting Up Display Output

1. Click "Open Display" in the operator dashboard
2. Move the display window to your projection screen
3. Or use it as an OBS Browser Source (1920x1080 recommended)

## ⚙️ Configuration

Copy `.env.example` to `.env.local` and configure:

### Required Services

| Service | Purpose | Get Key |
|---------|---------|---------|
| **Deepgram** | Speech-to-text (production) | [console.deepgram.com](https://console.deepgram.com) |
| **Groq** | LLM inference (contextual detection) | [console.groq.com](https://console.groq.com) |

### Optional Services

| Service | Purpose | Get Key |
|---------|---------|---------|
| **API.Bible** | Multiple translations (requires license) | [scripture.api.bible](https://scripture.api.bible) |
| **Supabase** | Database (for persistence, future) | [supabase.com](https://supabase.com) |

### Environment Variables

```bash
# Speech-to-Text (Required for production)
DEEPGRAM_API_KEY=your_key_here

# LLM Detection (Required for contextual detection)
GROQ_API_KEY=your_key_here

# Bible API (Optional - set to false to use public domain only)
ENABLE_API_BIBLE=false
API_BIBLE_KEY=your_key_here

# Default translation
DEFAULT_TRANSLATION=KJV  # KJV or WEB for public domain
```

## 🎛️ Audio Setup

### Recommended: Mixer Direct Feed

For best results, connect your sound mixer's aux send to a USB audio interface:

```
Mixer Aux Send → USB Audio Interface → Operator Laptop
```

This provides:
- Clean signal with no room echo
- No congregation noise
- Consistent audio levels

### Alternative: USB Microphone

Position a USB microphone near the pulpit. Enable "Preaching Mode" to pause detection during other speakers.

### Demo: Built-in Mic

Works for testing but **not recommended for production** — picks up room echo, congregation, and other noise.

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Approve pending detection / Display approved scripture |
| `Escape` | Clear display / Dismiss pending detection |
| `Space` | Toggle preaching mode (pause/resume detection) |
| `/` | Focus search box |
| `↑↓` | Navigate queue items |

## 📡 How Detection Works

VerseCue uses a three-stage detection pipeline:

### Stage 1: Normalization
Converts spoken text to parseable format:
- "chapter thirteen verse four" → "13:4"
- "First Corinthians" → "1 Corinthians"
- Removes filler phrases ("let's turn to", "open your bibles")

### Stage 2: Deterministic Parser (Fast, Free)
Grammar-based parsing catches explicit references:
- ✅ "John 3:16"
- ✅ "Romans chapter 8 verse 28"
- ✅ "First Corinthians 13:4-7"
- ✅ "Psalm 23"

**Handles 80%+ of references with zero API cost.**

### Stage 3: LLM Contextual Detection (Smart)
Only fires when Stage 2 finds nothing but trigger keywords are present:
- ✅ "As Paul wrote to Corinth about love" → 1 Corinthians 13
- ✅ "The shepherd's psalm" → Psalm 23
- ✅ "What Jesus said about worry" → Matthew 6:25-34

Uses Groq for ultra-fast inference (~200-500ms).

## 📤 Export Options

After a service, export your session data:

### Markdown Export
- Date/time and duration
- All scriptures displayed with timestamps
- AI-generated summary and themes
- Full transcript

### JSON Export
- Complete structured data
- Integration-ready format
- All metadata included

## 🎨 Customization

### Display Themes
- Dark mode (default): Deep navy with gold accents
- Light mode: Clean white with warm accents

Press `T` on the display window to toggle themes.

### Fonts
The display uses carefully chosen typography:
- **Reference**: Playfair Display (elegant serif)
- **Verse Text**: Cormorant Garamond (readable scripture font)
- **UI**: DM Sans (modern, clean)

## 🔧 Development

```bash
# Run development server
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 📁 Project Structure

```
versecue/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API routes
│   │   ├── display/        # Projection display page
│   │   └── page.tsx        # Main operator dashboard
│   ├── components/
│   │   ├── operator/       # Dashboard components
│   │   └── display/        # Display view components
│   ├── hooks/              # Custom React hooks
│   ├── lib/
│   │   ├── detection/      # Scripture detection engine
│   │   └── bible/          # Bible API providers
│   ├── stores/             # Zustand state management
│   └── types/              # TypeScript definitions
├── .env.example            # Environment template
└── package.json
```

## 🛡️ Privacy

VerseCue is designed with privacy in mind:

- **Audio is never stored** — Streaming only
- **Transcripts are session-only by default** — Cleared when you close the browser
- **Local-only mode available** — No data sent to cloud (except STT/LLM processing)
- **GDPR-compliant** — Suitable for UK/EU churches

## 📜 Bible Translation Licensing

### Public Domain (No License Required)
- KJV (King James Version)
- WEB (World English Bible)
- ASV (American Standard Version)

### Licensed Translations
To use ESV, NIV, NASB, etc., you'll need to:
1. Set `ENABLE_API_BIBLE=true`
2. Obtain an API.Bible commercial license
3. Add your `API_BIBLE_KEY`

**Note**: API.Bible's free tier is non-commercial. If you're charging for VerseCue, you'll need a commercial arrangement.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

---

**VerseCue** — *The right verse, right on time.*
