# WPA Hash ESSID Decoder Chrome Extension - AI Agent Instructions

## Project Overview
Chrome extension (Manifest V3) that decodes WPA hash ESSID values on hashtopolis.org pages. It processes both `<pre>` elements and DataTables, extracting hex-encoded SSID (6th element in `WPA*` format) and displaying it as readable text.

## Architecture & Key Components

### Three Processing Modes
1. **`<pre>` element processing** (`processWPAHashes`): In-place hex→text replacement in pre-formatted hash strings
2. **Table column injection** (`addSSIDColumn`): Dynamically adds "SSID" column between "Plaintext" and "Hash" in DataTables
3. **Duplicate filtering** (`toggleDuplicates`): Hides duplicate plaintext+SSID combinations, showing only oldest

### Critical Data Structure
WPA hash format: `WPA*02*hash*mac1*mac2*HEXSSID*data*...`
- Element at index 5 (0-based) = hex-encoded SSID
- Use `hex2a()` to decode to readable text
- Example: `4a554d50464f524a4f59` → `JUMPFORJOY`

### DOM Manipulation Pattern
**Always mark processed elements** to prevent re-processing by MutationObserver:
- Tables: `table.dataset.ssidHeaderAdded = 'true'`
- Rows: `row.dataset.ssidAdded = 'true'`
- Pre elements: `pre.dataset.wpaProcessed = 'true'`

### Table Column Insertion Logic
1. Find headers matching `text === 'hash'` (exact match) and `text.includes('plaintext')`
2. Verify they're adjacent (`hashIndex === plaintextIndex + 1`)
3. Insert SSID column at `headers[hashIndex]` position
4. For each row, hash cell is at original `cells[hashIndex]` before insertion
5. After insertion, SSID is always at `cells[2]` (fixed position)

### DataTables Integration
- Tables use `.dataTables_length` container for controls
- Add custom controls via `lengthControl.appendChild()` for inline positioning
- Manual sorting required for injected columns (DataTables initialized before column exists)
- Use CSS classes: `sorting`, `sorting_asc`, `sorting_desc` for sort indicators
- Reset other column classes when sorting to maintain UI consistency

## Development Workflow

### Testing Changes
```bash
1. Edit code
2. Navigate to chrome://extensions/
3. Click refresh icon on extension card
4. Hard refresh target page (Ctrl+Shift+R)
```

### Debugging
- Console logs prefixed with `[WPA ESSID Decoder]` for filtering
- Check browser console (F12) for extension logs
- Test domain filtering in options page
- Verify processing flags on DOM elements

### Domain Filtering
- Stored in `chrome.storage.sync` as `allowedDomains` array
- Wildcard support: `hashtopolis.*` converts to regex `^hashtopolis\..*$`
- Empty array = run on all sites
- Checked via `isDomainAllowed()` before any processing

## Code Conventions

### Event Listeners
- Use closure variables for state (e.g., `sortDirection` in SSID sort handler)
- Add cross-listeners to sync UI state (other headers reset SSID sort styling)
- Always check element existence before adding listeners

### Inline Styling
- Use `style` properties for dynamic UI: `verticalAlign`, `cursor`, `display`
- Copy existing `className` from adjacent elements for consistency
- Match DataTables attributes: `tabindex`, `aria-controls`, etc.

### Performance
- MutationObserver runs on every DOM change - functions must be idempotent
- Early returns for already-processed elements
- Use `Array.from()` for NodeLists before array operations

## Common Pitfalls

1. **Column index shifting**: Hash cell index changes after SSID column insertion. Always use original `hashIndex` for initial cell access.
2. **Partial text matching**: Use exact match for "Hash" header (`text === 'hash'`) to avoid matching "Hashlist"
3. **CSS class management**: Remove ALL sorting classes (`sorting`, `sorting_asc`, `sorting_desc`) before setting new state
4. **Duplicate detection**: Compare `plaintext + '::' + ssid`, not just hash values

## File Reference
- [content.js](content.js) - All DOM manipulation and processing logic (343 lines)
- [options.js](options.js) - Domain settings management
- [manifest.json](manifest.json) - Extension config, runs at `document_idle`
