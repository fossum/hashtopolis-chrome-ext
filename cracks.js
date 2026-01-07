// Cracks page functionality - adds SSID column to DataTables

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

// Function to toggle conversion on/off for cracks page
function toggleCracksConversion(enabled) {
  console.log('[WPA ESSID Decoder] Toggle cracks conversion:', enabled);

  // Show/hide table columns
  const tables = document.querySelectorAll('table');
  tables.forEach(table => {
    const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
    if (!headerRow) return;

    const headers = Array.from(headerRow.querySelectorAll('th, td'));
    const ssidHeaderIndex = headers.findIndex(h => h.textContent.trim() === 'SSID');

    if (ssidHeaderIndex === -1) return;

    headers[ssidHeaderIndex].style.display = enabled ? '' : 'none';

    const tbody = table.querySelector('tbody');
    if (tbody) {
      const dataRows = tbody.querySelectorAll('tr');
      dataRows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length > ssidHeaderIndex && cells[ssidHeaderIndex]) {
          cells[ssidHeaderIndex].style.display = enabled ? '' : 'none';
        }
      });
    }
  });

  // If enabling and columns don't exist, create them
  if (enabled) {
    addSSIDColumnImpl();
  }

  console.log('[WPA ESSID Decoder] Cracks conversion toggled to:', enabled ? 'shown' : 'hidden');
}
