// Search page functionality - provides hex/string converter tool

// Function to add hex/string converter controls on search page
function addSearchConversionToggleControl() {
  // Skip if already added
  if (document.getElementById('hexToStringConverter')) {
    return;
  }

  // Try to find the first table row using XPath
  const firstRow = document.evaluate(
    '/html/body/div[1]/form/div/div/table/tbody/tr[1]',
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  ).singleNodeValue;

  if (!firstRow || !firstRow.parentNode) {
    console.log('[WPA ESSID Decoder] Could not find search page table row');
    return;
  }

  // Create a new row for the converter
  const newRow = document.createElement('tr');
  const newCell = document.createElement('td');
  newCell.setAttribute('colspan', '2');
  newCell.style.paddingTop = '10px';
  newCell.style.paddingBottom = '10px';

  // Create container div
  const container = document.createElement('div');
  container.id = 'hexToStringConverter';
  container.style.display = 'flex';
  container.style.gap = '10px';
  container.style.alignItems = 'center';

  // Hex input
  const hexLabel = document.createElement('label');
  hexLabel.textContent = 'Hex: ';
  hexLabel.style.fontWeight = 'bold';

  const hexInput = document.createElement('input');
  hexInput.type = 'text';
  hexInput.id = 'hexInput';
  hexInput.placeholder = 'Enter hex value';
  hexInput.style.width = '300px';
  hexInput.style.padding = '5px';

  // String input
  const stringLabel = document.createElement('label');
  stringLabel.textContent = 'String: ';
  stringLabel.style.fontWeight = 'bold';
  stringLabel.style.marginLeft = '20px';

  const stringInput = document.createElement('input');
  stringInput.type = 'text';
  stringInput.id = 'stringInput';
  stringInput.placeholder = 'Enter string value';
  stringInput.style.width = '300px';
  stringInput.style.padding = '5px';

  // Add event listeners for bidirectional conversion
  hexInput.addEventListener('input', function() {
    // Filter out non-hex characters
    const filtered = hexInput.value.replace(/[^0-9a-fA-F]/g, '');
    if (hexInput.value !== filtered) {
      hexInput.value = filtered;
    }

    if (hexInput.value.trim()) {
      try {
        const decoded = hex2a(hexInput.value.trim());
        stringInput.value = decoded;
      } catch (e) {
        console.log('[WPA ESSID Decoder] Invalid hex input');
      }
    } else {
      stringInput.value = '';
    }
  });

  stringInput.addEventListener('input', function() {
    if (stringInput.value) {
      const encoded = stringToHex(stringInput.value);
      hexInput.value = encoded;
    } else {
      hexInput.value = '';
    }
  });

  // Assemble the converter
  container.appendChild(hexLabel);
  container.appendChild(hexInput);
  container.appendChild(stringLabel);
  container.appendChild(stringInput);

  newCell.appendChild(container);
  newRow.appendChild(newCell);

  // Insert the new row after the first row
  firstRow.parentNode.insertBefore(newRow, firstRow.nextSibling);

  console.log('[WPA ESSID Decoder] Search page hex/string converter added');
}

// Helper function to convert string to hex
function stringToHex(str) {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    const hexValue = charCode.toString(16).padStart(2, '0');
    hex += hexValue;
  }
  return hex;
}
