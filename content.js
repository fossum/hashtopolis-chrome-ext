// Check if current domain is allowed
function isDomainAllowed(allowedDomains) {
  if (!allowedDomains || allowedDomains.length === 0) {
    return true; // Run on all sites if no domains specified
  }

  const currentHost = window.location.hostname;

  return allowedDomains.some(domain => {
    // Convert wildcard pattern to regex
    const pattern = domain.replace(/\./g, '\\.').replace(/\*/g, '.*');
    const regex = new RegExp('^' + pattern + '$');
    return regex.test(currentHost);
  });
}

// Function to decode hex to ASCII
function hex2a(hex) {
  var str = '';
  for (var i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return str;
}

// Function to add SSID column to cracks.php table
function addSSIDColumn() {
  console.log('[WPA ESSID Decoder] Running addSSIDColumn...');

  // Find all tables
  const tables = document.querySelectorAll('table');
  console.log('[WPA ESSID Decoder] Found tables:', tables.length);

  tables.forEach(table => {
    // Find the header row
    const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
    if (!headerRow) return;

    const headers = Array.from(headerRow.querySelectorAll('th, td'));
    console.log('[WPA ESSID Decoder] Headers:', headers.map(h => h.textContent.trim()));

    // Find the plaintext and hash column indices
    let plaintextIndex = -1;
    let hashIndex = -1;

    headers.forEach((header, index) => {
      const text = header.textContent.trim().toLowerCase();
      if (text.includes('plaintext') || text.includes('plain')) {
        plaintextIndex = index;
      }
      if (text === 'hash') {
        hashIndex = index;
      }
    });

    console.log('[WPA ESSID Decoder] Plaintext index:', plaintextIndex, 'Hash index:', hashIndex);

    // If we found both columns and they're adjacent
    if (plaintextIndex !== -1 && hashIndex === plaintextIndex + 1) {
      console.log('[WPA ESSID Decoder] Columns are adjacent, processing table...');

      // Add header if not already added
      if (!table.dataset.ssidHeaderAdded) {
        const newHeader = document.createElement('th');
        newHeader.textContent = 'SSID';
        newHeader.className = headers[hashIndex].className;
        newHeader.setAttribute('tabindex', '0');
        newHeader.setAttribute('aria-controls', 'cracks');
        newHeader.setAttribute('rowspan', '1');
        newHeader.setAttribute('colspan', '1');
        headerRow.insertBefore(newHeader, headers[hashIndex]);
        table.dataset.ssidHeaderAdded = 'true';
        console.log('[WPA ESSID Decoder] Header added!');
      }

      // Process all data rows in tbody
      const tbody = table.querySelector('tbody');
      if (tbody) {
        const dataRows = tbody.querySelectorAll('tr');
        console.log('[WPA ESSID Decoder] Processing', dataRows.length, 'data rows');

        dataRows.forEach((row, idx) => {
          // Skip if already processed
          if (row.dataset.ssidAdded === 'true') {
            return;
          }

          const cells = Array.from(row.querySelectorAll('td'));
          if (cells.length > hashIndex) {
            // The hash cell is at the original hashIndex (before we added our column to the row)
            const hashCell = cells[hashIndex];
            if (!hashCell) return;

            const hashText = hashCell.textContent.trim();

            // Extract SSID from WPA hash
            let ssidText = '';
            if (hashText.startsWith('WPA*')) {
              const parts = hashText.split('*');
              if (parts.length > 5 && parts[5]) {
                ssidText = hex2a(parts[5]);
              }
            }

            // Insert new cell for SSID
            const newCell = document.createElement('td');
            newCell.textContent = ssidText;
            row.insertBefore(newCell, hashCell);

            // Mark row as processed
            row.dataset.ssidAdded = 'true';

            if (idx < 3) {
              console.log('[WPA ESSID Decoder] Row', idx, 'SSID:', ssidText);
            }
          }
        });
      }
    }
  });
}

// Function to extract and decode the 6th element from WPA hash lines
function processWPAHashes() {
  // Find all pre elements
  const preElements = document.querySelectorAll('pre');

  preElements.forEach(pre => {
    // Skip if already processed
    if (pre.dataset.wpaProcessed === 'true') {
      return;
    }

    const text = pre.textContent;
    const lines = text.split('\n');

    // Check if this looks like WPA hash data
    if (lines.some(line => line.trim().startsWith('WPA*'))) {
      let modified = false;

      const newLines = lines.map(line => {
        if (line.trim().startsWith('WPA*')) {
          const parts = line.split('*');
          // The 6th element is at index 5 (0-based)
          if (parts.length > 5 && parts[5]) {
            const hexESSID = parts[5];
            const decodedESSID = hex2a(hexESSID);
            // Replace the hex with the decoded text
            parts[5] = decodedESSID;
            modified = true;
            return parts.join('*');
          }
        }
        return line;
      });

      if (modified) {
        pre.textContent = newLines.join('\n');
        // Mark as processed
        pre.dataset.wpaProcessed = 'true';
      }
    }
  });
}

// Initialize extension
chrome.storage.sync.get(['allowedDomains'], function(result) {
  const allowedDomains = result.allowedDomains || ['hashtopolis.*'];

  // Only run if current domain is allowed
  if (isDomainAllowed(allowedDomains)) {
    // Run when page loads
    processWPAHashes();
    addSSIDColumn();

    // Also observe for dynamic content changes
    const observer = new MutationObserver(() => {
      processWPAHashes();
      addSSIDColumn();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
});
