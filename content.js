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
  // Check if conversion is enabled
  chrome.storage.sync.get(['conversionEnabled'], function(result) {
    const enabled = result.conversionEnabled !== false; // Default to true
    if (!enabled) {
      console.log('[WPA ESSID Decoder] Conversion disabled, skipping addSSIDColumn');
      return;
    }
    addSSIDColumnImpl();
  });
}

// Implementation of addSSIDColumn
function addSSIDColumnImpl() {
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
        newHeader.style.cursor = 'pointer';

        // Add click handler for sorting
        let sortDirection = 'asc';
        newHeader.addEventListener('click', function() {
          const tbody = table.querySelector('tbody');
          if (!tbody) return;

          const rows = Array.from(tbody.querySelectorAll('tr'));

          // Sort rows based on SSID column (index 2 after our insertion)
          rows.sort((a, b) => {
            const aCells = a.querySelectorAll('td');
            const bCells = b.querySelectorAll('td');

            if (aCells.length <= 2 || bCells.length <= 2) return 0;

            const aSSID = aCells[2].textContent.trim().toLowerCase();
            const bSSID = bCells[2].textContent.trim().toLowerCase();

            if (sortDirection === 'asc') {
              return aSSID.localeCompare(bSSID);
            } else {
              return bSSID.localeCompare(aSSID);
            }
          });

          // Reattach rows in sorted order
          rows.forEach(row => tbody.appendChild(row));

          // Toggle sort direction
          sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';

          // Update header classes to show sort direction
          headers.forEach(h => {
            h.classList.remove('sorting_asc', 'sorting_desc');
            if (!h.classList.contains('sorting')) {
              h.classList.add('sorting');
            }
          });
          newHeader.classList.remove('sorting', 'sorting_asc', 'sorting_desc');
          newHeader.classList.add(sortDirection === 'desc' ? 'sorting_asc' : 'sorting_desc');

          console.log('[WPA ESSID Decoder] Sorted by SSID:', sortDirection === 'desc' ? 'asc' : 'desc');
        });

        // Add listeners to other headers to reset SSID column styling
        headers.forEach(header => {
          header.addEventListener('click', function() {
            // Reset SSID header to default sorting state
            newHeader.classList.remove('sorting_asc', 'sorting_desc');
            if (!newHeader.classList.contains('sorting')) {
              newHeader.classList.add('sorting');
            }
          });
        });

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

// Function to add ESSID conversion toggle checkbox
function addConversionToggleControl() {
  // Skip if already added
  if (document.getElementById('enableConversion')) {
    return;
  }

  // Try to find the specific div container first
  let targetContainer = document.evaluate(
    '/html/body/div[1]/div[1]/div/table/tbody/tr[3]/td/div[2]',
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  ).singleNodeValue;

  // Fallback: Look for Show Crackpos button container
  if (!targetContainer) {
    const buttons = document.querySelectorAll('button');
    for (const button of buttons) {
      if (button.textContent.includes('Show Crackpos') || button.textContent.includes('Crackpos')) {
        targetContainer = button.parentElement;
        break;
      }
    }
  }

  // Fallback: Look for DataTables length control
  if (!targetContainer) {
    targetContainer = document.querySelector('.dataTables_length');
  }

  if (!targetContainer) {
    console.log('[WPA ESSID Decoder] Could not find suitable container for checkbox');
    return;
  }

  // Create checkbox container
  const checkboxContainer = document.createElement('label');
  checkboxContainer.style.marginLeft = '20px';
  checkboxContainer.style.display = 'inline-block';
  checkboxContainer.style.verticalAlign = 'middle';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = 'enableConversion';
  checkbox.style.marginRight = '5px';
  checkbox.style.verticalAlign = 'middle';

  // Get initial state from storage
  chrome.storage.sync.get(['conversionEnabled'], function(result) {
    checkbox.checked = result.conversionEnabled !== false; // Default to true
  });

  const labelText = document.createTextNode('Show SSID');

  checkboxContainer.appendChild(checkbox);
  checkboxContainer.appendChild(labelText);

  // Append to the target container
  targetContainer.appendChild(checkboxContainer);

  // Add event listener
  checkbox.addEventListener('change', function() {
    const enabled = checkbox.checked;
    // Save state to storage
    chrome.storage.sync.set({ conversionEnabled: enabled }, function() {
      console.log('[WPA ESSID Decoder] Conversion enabled:', enabled);
      // Toggle conversion
      toggleConversion(enabled);
    });
  });

  console.log('[WPA ESSID Decoder] Conversion toggle control added to:', targetContainer.tagName);
}

// Function to add duplicate removal checkbox
function addDuplicateRemovalControl() {
  // Look for the DataTables length control (show entries dropdown)
  const lengthControl = document.querySelector('.dataTables_length');

  if (!lengthControl || document.getElementById('hideDuplicates')) {
    return; // Already added or control not found
  }

  // Create checkbox container
  const checkboxContainer = document.createElement('label');
  checkboxContainer.style.marginLeft = '20px';
  checkboxContainer.style.display = 'inline-block';
  checkboxContainer.style.verticalAlign = 'middle';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = 'hideDuplicates';
  checkbox.style.marginRight = '5px';
  checkbox.style.verticalAlign = 'middle';

  const labelText = document.createTextNode('Hide duplicates (show oldest)');

  checkboxContainer.appendChild(checkbox);
  checkboxContainer.appendChild(labelText);

  // Append to the same container as the length control
  lengthControl.appendChild(checkboxContainer);

  // Add event listener
  checkbox.addEventListener('change', toggleDuplicates);

  console.log('[WPA ESSID Decoder] Duplicate removal control added');
}

// Function to toggle conversion on/off
function toggleConversion(enabled) {
  console.log('[WPA ESSID Decoder] Toggle conversion:', enabled);

  if (enabled) {
    // Enable: Process pre elements and show table columns
    const preElements = document.querySelectorAll('pre');
    preElements.forEach(pre => {
      if (pre.dataset.wpaOriginal) {
        // We have processed this before, convert again
        const text = pre.dataset.wpaOriginal;
        const lines = text.split('\n');
        const newLines = lines.map(line => {
          if (line.trim().startsWith('WPA*')) {
            const parts = line.split('*');
            if (parts.length > 5 && parts[5]) {
              const hexESSID = parts[5];
              const decodedESSID = hex2a(hexESSID);
              parts[5] = decodedESSID;
              return parts.join('*');
            }
          }
          return line;
        });
        pre.textContent = newLines.join('\n');
      } else if (pre.dataset.wpaProcessed !== 'true') {
        // Not processed yet, clear flag and process
        delete pre.dataset.wpaProcessed;
      }
    });

    // Process any new elements
    processWPAHashesImpl();

    // Show table columns if they exist
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
      const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
      if (!headerRow) return;

      const headers = Array.from(headerRow.querySelectorAll('th, td'));
      const ssidHeaderIndex = headers.findIndex(h => h.textContent.trim() === 'SSID');

      if (ssidHeaderIndex !== -1) {
        headers[ssidHeaderIndex].style.display = '';

        const tbody = table.querySelector('tbody');
        if (tbody) {
          const dataRows = tbody.querySelectorAll('tr');
          dataRows.forEach(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            if (cells.length > ssidHeaderIndex && cells[ssidHeaderIndex]) {
              cells[ssidHeaderIndex].style.display = '';
            }
          });
        }
      }
    });

    addSSIDColumnImpl();
  } else {
    // Disable: Restore original hex in pre elements and hide table columns
    const preElements = document.querySelectorAll('pre[data-wpa-original]');
    preElements.forEach(pre => {
      // Restore original hex
      pre.textContent = pre.dataset.wpaOriginal;
    });

    // Hide table columns
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
      const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
      if (!headerRow) return;

      const headers = Array.from(headerRow.querySelectorAll('th, td'));
      const ssidHeaderIndex = headers.findIndex(h => h.textContent.trim() === 'SSID');

      if (ssidHeaderIndex === -1) return;

      headers[ssidHeaderIndex].style.display = 'none';

      const tbody = table.querySelector('tbody');
      if (tbody) {
        const dataRows = tbody.querySelectorAll('tr');
        dataRows.forEach(row => {
          const cells = Array.from(row.querySelectorAll('td'));
          if (cells.length > ssidHeaderIndex && cells[ssidHeaderIndex]) {
            cells[ssidHeaderIndex].style.display = 'none';
          }
        });
      }
    });
  }

  console.log('[WPA ESSID Decoder] Conversion toggled to:', enabled ? 'shown' : 'hidden');
}

// Function to toggle duplicate rows
function toggleDuplicates() {
  const checkbox = document.getElementById('hideDuplicates');
  if (!checkbox) return;

  const hideDuplicates = checkbox.checked;
  console.log('[WPA ESSID Decoder] Toggle duplicates:', hideDuplicates);

  const table = document.querySelector('table#cracks, table.dataTable');
  if (!table) return;

  const tbody = table.querySelector('tbody');
  if (!tbody) return;

  const rows = Array.from(tbody.querySelectorAll('tr'));

  if (hideDuplicates) {
    // Track seen combinations of plaintext+SSID and their first occurrence (oldest)
    const seenCombinations = new Map();

    rows.forEach(row => {
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length === 0) return;

      // Based on the table structure: Time found (0), Plaintext (1), SSID (2), Hash (3)...
      // After we added the SSID column between Plaintext and Hash
      let plaintext = '';
      let ssid = '';

      if (cells.length > 2) {
        plaintext = cells[1].textContent.trim();
        ssid = cells[2].textContent.trim();
      }

      if (plaintext) {
        const combinationKey = plaintext + '::' + ssid;

        if (seenCombinations.has(combinationKey)) {
          // This is a duplicate, hide it
          row.style.display = 'none';
          row.dataset.duplicateHidden = 'true';
        } else {
          // First occurrence, keep it visible and track it
          seenCombinations.set(combinationKey, row);
          row.style.display = '';
          row.dataset.duplicateHidden = 'false';
        }
      }
    });

    console.log('[WPA ESSID Decoder] Hid duplicates, showing', seenCombinations.size, 'unique plaintext+SSID combinations');
  } else {
    // Show all rows
    rows.forEach(row => {
      row.style.display = '';
      row.dataset.duplicateHidden = 'false';
    });
    console.log('[WPA ESSID Decoder] Showing all rows');
  }
}

// Function to extract and decode the 6th element from WPA hash lines
function processWPAHashes() {
  // Check if conversion is enabled
  chrome.storage.sync.get(['conversionEnabled'], function(result) {
    const enabled = result.conversionEnabled !== false; // Default to true
    if (!enabled) {
      console.log('[WPA ESSID Decoder] Conversion disabled, skipping processWPAHashes');
      return;
    }
    processWPAHashesImpl();
  });
}

// Implementation of processWPAHashes
function processWPAHashesImpl() {
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
      const originalLines = [...lines]; // Store original

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
        // Store original text in data attribute
        pre.dataset.wpaOriginal = text;
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
    addConversionToggleControl();
    addDuplicateRemovalControl();

    // Also observe for dynamic content changes
    const observer = new MutationObserver(() => {
      processWPAHashes();
      addSSIDColumn();
      addConversionToggleControl();
      addDuplicateRemovalControl();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
});
