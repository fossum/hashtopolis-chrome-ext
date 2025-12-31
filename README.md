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
- Displays the decoded ESSID(s) below the hash data

## Example

For a hash like:
```
WPA*01*562e68d62c3bb6dc2eee7d043a6bf10e*082697623018*da4732c17e1c*436f756e747279436c756235***:59535953
```

The extension extracts `436f756e747279436c756235` and decodes it to `CountryClub5`
