# WPA Hash ESSID Decoder Chrome Extension

This Chrome extension automatically detects WPA hash data on web pages and displays the decoded ESSID (network name) from the sixth hex element.

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked"
4. Select the `chrome-extension` folder

## How it works

The extension:
- Scans all `<pre>` elements on the page for WPA hash data
- Extracts the 6th element (between 5th and 6th asterisks) which contains the hex-encoded ESSID
- Decodes the hex to readable text
- Replaces the hex value in-place with the decoded ESSID

## Configuration

Access settings by right-clicking the extension icon and selecting "Options" or navigating to `chrome://extensions/` and clicking "Details" → "Extension options".

### Allowed Domains
- Configure which domains the extension runs on
- One domain per line
- Supports wildcards (e.g., `hashtopolis.*` or `*.example.org`)
- Default: `hashtopolis.*`
- Leave empty to run on all sites

## Example

For a hash like:
```
WPA*01*562e68d62c3bb6dc2eee7d043a6bf10e*082697623018*da4732c17e1c*436f756e747279436c756235***:59535953
```

The extension extracts `436f756e747279436c756235` and replaces it in-place with `CountryClub5`:
```
WPA*01*562e68d62c3bb6dc2eee7d043a6bf10e*082697623018*da4732c17e1c*CountryClub5***:59535953
```

## Development Notes

### Architecture
- **manifest.json** - Extension configuration (v3), permissions, content script registration
- **content.js** - Main logic for detecting and decoding WPA hashes
- **options.html** - Settings page UI
- **options.js** - Settings page logic and domain management

### Key Features
- Uses `chrome.storage.sync` for cross-device settings sync
- MutationObserver watches for dynamically added content
- Prevents re-processing with `data-wpa-processed` attribute
- Wildcard domain matching support

### Testing Changes
1. Make code changes
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Reload the target web page

### Debugging
- Check console for errors: Right-click page → Inspect → Console
- View extension logs: `chrome://extensions/` → Details → Inspect views: background page (if applicable)
- Test on sample HTML with `<pre>WPA*01*...*hexvalue*...</pre>` elements
