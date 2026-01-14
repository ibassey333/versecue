# Dashboard Upgrade Note

The new premium UI components have been created:
- src/components/dashboard/ControlsBar.tsx
- src/components/dashboard/SettingsDrawer.tsx
- src/components/dashboard/HelpPopover.tsx

## Integration Required

Your existing Dashboard.tsx has complex functionality that should be preserved.
The new components need to be integrated carefully.

Key changes to make in Dashboard.tsx:

1. Add imports:
```tsx
import { ControlsBar, SettingsDrawer } from '@/components/dashboard';
```

2. Add state:
```tsx
const [showSettings, setShowSettings] = useState(false);
```

3. Replace the old header (around line 780-813) with:
```tsx
<ControlsBar
  isListening={isListening}
  isPaused={isPaused}
  onStartListening={startListening}
  onStopListening={stopListening}
  onTogglePause={togglePause}
  onNewSession={resetSession}
  translation={selectedTranslation}
  onTranslationChange={setSelectedTranslation}
  availableTranslations={['KJV', 'WEB', 'ASV']}
  onOpenSettings={() => setShowSettings(true)}
/>
```

4. Add at end of component (before final closing tag):
```tsx
<SettingsDrawer
  isOpen={showSettings}
  onClose={() => setShowSettings(false)}
  audioDevices={audioDevices}
  selectedDevice={selectedDevice}
  onDeviceChange={setSelectedDevice}
  speechProvider={activeSpeechProvider}
  onSpeechProviderChange={setActiveSpeechProvider}
  deepgramAvailable={deepgramAvailable}
  aiDetectionEnabled={aiDetectionEnabled}
  onAiDetectionChange={setAiDetectionEnabled}
  groqAvailable={groqAvailable}
  autoApprove={autoApproveEnabled}
  onAutoApproveChange={setAutoApproveEnabled}
  apiStatus={{
    bible: apiBibleStatus,
    deepgram: deepgramStatus,
    groq: groqStatus,
  }}
/>
```

5. Remove:
- The old settings inline expansion
- The help bar expansion
- The "Live Session • Ready" header

The goal is to keep all your existing functionality while using the new
cleaner UI components.
