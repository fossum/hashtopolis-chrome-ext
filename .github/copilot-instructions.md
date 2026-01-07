# WPA Hash ESSID Decoder Chrome Extension - AI Agent Instructions

## Project Overview
Chrome extension (Manifest V3) that decodes WPA hash ESSID values on hashtopolis.org pages. It processes both `<pre>` elements (hashes.php) and DataTables (cracks.php), extracting hex-encoded SSID (6th element in `WPA*` format) and displaying it as readable text.

## File Structure & Modules

### Core Files
1. **[content.js](content.js)** - Main coordinator (40 lines)
   - Shared utilities: `isDomainAllowed()`, `hex2a()`
   - Main `toggleConversion()` - delegates to page-specific toggle functions
   - Initialization logic with function existence checks
   - MutationObserver setup

2. **[hashes.js](hashes.js)** - Hashes page functionality (~200 lines)
   - `processWPAHashes()` / `processWPAHashesImpl()` - Process `<pre>` elements
   - `addConversionToggleControl()` - Adds "Show SSID" checkbox
   - `toggleHashesConversion()` - Toggles hex↔text in pre elements
   - Stores original hex in `pre.dataset.wpaOriginal` for toggle restoration

3. **[cracks.js](cracks.js)** - Cracks page functionality (~320 lines)
   - `addSSIDColumn()` / `addSSIDColumnImpl()` - Adds SSID column to tables
   - `addDuplicateRemovalControl()` - Adds "Hide duplicates" checkbox
   - `toggleDuplicates()` - Filters duplicate plaintext+SSID combinations
   - `toggleCracksConversion()` - Shows/hides SSID column

4. **[options.js](options.js)** - Domain filtering settings UI
5. **[manifest.json](manifest.json)** - Extension config
   - **CRITICAL**: Script load order: `["hashes.js", "cracks.js", "content.js"]`
   - Functions must be available before content.js initialization runs

## Architecture & Key Components

### Page Detection Pattern
Functions are page-agnostic and use feature detection:
- `processWPAHashes()` only runs if `<pre>` elements with WPA hashes exist
- `addSSIDColumn()` only runs if table has adjacent "Plaintext" and "Hash" columns
- Initialization uses `typeof functionName === 'function'` to check module availability

### Two Processing Modes

#### 1. Hashes Page (`<pre>` elements)
- **Function**: `processWPAHashesImpl()` in hashes.js
- In-place hex→text replacement in pre-formatted hash strings
- **Toggle mechanism**: Stores original in `pre.dataset.wpaOriginal`, swaps on toggle
- Marked with `pre.dataset.wpaProcessed = 'true'`

#### 2. Cracks Page (DataTables)
- **Function**: `addSSIDColumnImpl()` in cracks.js
- Dynamically adds "SSID" column between "Plaintext" and "Hash"
- **Toggle mechanism**: CSS `display: none/''` on column (no data removal)
- **Bonus feature**: `toggleDuplicates()` - Hides duplicate plaintext+SSID combinations, showing only oldest

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
- Pre original storage: `pre.dataset.wpaOriginal = originalText`

### Table Column Insertion Logic
1. Find headers matching `text === 'hash'` (exact match) and `text.includes('plaintext')`
2. Verify they're adjacent (`hashIndex === plaintextIndex + 1`)
3. Insert SSID column at `headers[hashIndex]` position
4. For each row, hash cell is at original `cells[hashIndex]` before insertion
5. After insertion, SSID is always at `cells[2]` (fixed position)

### Toggle/Checkbox Controls

#### Show SSID Checkbox (both pages)
- **Location**: Tries XPath `/html/body/div[1]/div[1]/div/table/tbody/tr[3]/td/div[2]` first
- **Fallbacks**: "Show Crackpos" button container → `.dataTables_length`
- **Storage**: `chrome.storage.sync` key `conversionEnabled` (default: true)
- **ID**: `enableConversion`
- **Action**: Calls `toggleConversion()` which delegates to page-specific functions

#### Hide Duplicates Checkbox (cracks page only)
- **Location**: `.dataTables_length` container
- **ID**: `hideDuplicates`
- **Logic**: Compares `plaintext + '::' + ssid`, hides all but first occurrence

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
- Checked via `isDomainAllowed()` in content.js before any processing

### State Management
- **Conversion Toggle**: `chrome.storage.sync` key `conversionEnabled` (boolean, default: true)
- Functions check this before processing: `addSSIDColumn()`, `processWPAHashes()`
- Toggle saves state and calls respective page's toggle function

## Code Conventions

### Module Pattern
- **No imports/exports**: Uses global scope (Chrome content script limitation)
- **Function existence checks**: `if (typeof functionName === 'function')` before calling
- **Idempotent functions**: Safe to call multiple times (check processing flags first)
- **Shared utilities**: `hex2a()` and `isDomainAllowed()` in content.js available to all modules

### Wrapper + Implementation Pattern
```javascript
// Wrapper checks storage
function someFunction() {
  chrome.storage.sync.get(['conversionEnabled'], function(result) {
    const enabled = result.conversionEnabled !== false;
    if (!enabled) return;
    someFunctionImpl();
  });
}

// Implementation does the work
function someFunctionImpl() {
  // actual logic here
}
```

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
5. **Module load order**: manifest.json must load hashes.js and cracks.js BEFORE content.js
6. **Function availability**: Always check `typeof functionName === 'function'` before cross-module calls

## File Reference
- [content.js](content.js) - Main coordinator with shared utilities (~40 lines)
- [hashes.js](hashes.js) - Hashes page functionality (~200 lines)
- [cracks.js](cracks.js) - Cracks page functionality (~320 lines)
- [options.js](options.js) - Domain settings management
- [manifest.json](manifest.json) - Extension config, runs at `document_idle`
