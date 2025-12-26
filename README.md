# Gemini Navigator

A Chrome extension that enhances your Google Gemini experience by automatically synchronizing Chrome tab titles with conversation titles and providing a navigable conversation index sidebar.

## Features

- **Automatic Tab Title Sync**: Automatically updates Chrome tab titles to match your Gemini conversation titles, preventing them from reverting to generic titles like "My content"
- **Conversation Index Sidebar**: Generates a right-side navigation panel that displays all your conversation items for quick access
- **Title Sentinel**: Monitors and prevents the Gemini application from resetting conversation titles back to default values
- **Smooth Navigation**: Click on any conversation item in the sidebar to instantly scroll to that part of the conversation
- **Dark Mode Support**: Automatically adapts to Gemini's theme, including dark mode
- **SPA Navigation Handling**: Properly handles single-page application navigation and state management

## Installation

### From Chrome Web Store
*(Coming soon)*

### Manual Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top right)
4. Click "Load unpacked"
5. Select the extension directory

## Usage

1. Navigate to [Google Gemini](https://gemini.google.com/)
2. The extension will automatically:
   - Sync the current conversation title to your Chrome tab
   - Generate a conversation index in the right sidebar
3. Click the toggle button on the left edge of the screen to show/hide the sidebar
4. Click any item in the conversation index to jump to that part of the conversation

## How It Works

The extension uses a content script that:

- **Monitors DOM Changes**: Observes the Gemini page for conversation updates using MutationObserver
- **Extracts Conversation Data**: Identifies user queries and conversation titles from the DOM
- **Title Synchronization**: Implements a title sentinel mechanism that prevents title rollback
- **Navigation Guard**: Intercepts SPA navigation events to maintain state consistency

## Technical Details

- **Manifest Version**: 3
- **Target Domain**: `https://gemini.google.com/*`
- **Permissions**: 
  - `storage`: For persisting user preferences and state
- **Content Script**: Injected into Gemini pages to monitor and enhance the UI

## Project Structure

```
Gemini Navigator/
├── manifest.json          # Extension manifest
├── content.js             # Main content script
├── icons/                 # Extension icons
│   ├── gemini navigator icon-16.png
│   ├── gemini navigator icon-32.png
│   ├── gemini navigator icon-48.png
│   ├── gemini navigator icon-128.png
│   └── gemini navigator icon.svg
└── marketing material/    # Marketing assets
```

## Development

This extension is built with vanilla JavaScript and uses:
- MutationObserver for DOM monitoring
- Chrome Extension APIs (Manifest V3)
- No external dependencies

## Privacy

- The extension only operates on `https://gemini.google.com/*`
- No data is sent to external servers
- All processing happens locally in your browser
- Storage permission is used only for local preferences

## License

*(Add your license here)*

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Issues

If you encounter any issues or have feature requests, please open an issue on GitHub.

