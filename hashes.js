// Hashes page functionality - processes WPA hashes in <pre> elements

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
      toggleHashesConversion(enabled);
    });
  });

  console.log('[WPA ESSID Decoder] Conversion toggle control added to:', targetContainer.tagName);
}

// Function to toggle conversion on/off for hashes page
function toggleHashesConversion(enabled) {
  console.log('[WPA ESSID Decoder] Toggle hashes conversion:', enabled);

  if (enabled) {
    // Enable: Process pre elements
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
  } else {
    // Disable: Restore original hex in pre elements
    const preElements = document.querySelectorAll('pre[data-wpa-original]');
    preElements.forEach(pre => {
      // Restore original hex
      pre.textContent = pre.dataset.wpaOriginal;
    });
  }

  console.log('[WPA ESSID Decoder] Hashes conversion toggled to:', enabled ? 'shown' : 'hidden');
}
