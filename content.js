// Function to decode hex to ASCII
function hex2a(hex) {
  var str = '';
  for (var i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return str;
}

// Function to extract and decode the 6th element from WPA hash lines
function processWPAHashes() {
  // Find all pre elements
  const preElements = document.querySelectorAll('pre');
  
  preElements.forEach(pre => {
    const text = pre.textContent;
    const lines = text.split('\n');
    
    // Check if this looks like WPA hash data
    if (lines.some(line => line.trim().startsWith('WPA*'))) {
      // Create a new element to display decoded ESSIDs
      const decodedDiv = document.createElement('div');
      decodedDiv.style.cssText = 'margin-top: 10px; padding: 10px; background-color: #f0f0f0; border: 1px solid #ccc; border-radius: 4px; font-family: monospace;';
      
      const decodedESSIDs = new Set();
      
      lines.forEach(line => {
        if (line.trim().startsWith('WPA*')) {
          const parts = line.split('*');
          // The 6th element is at index 5 (0-based)
          if (parts.length > 5 && parts[5]) {
            const hexESSID = parts[5];
            const decodedESSID = hex2a(hexESSID);
            decodedESSIDs.add(decodedESSID);
          }
        }
      });
      
      if (decodedESSIDs.size > 0) {
        decodedDiv.innerHTML = '<strong>Decoded ESSID(s):</strong><br>' + 
          Array.from(decodedESSIDs).map(essid => `&bull; ${essid}`).join('<br>');
        
        // Insert after the pre element's parent
        const parent = pre.parentElement;
        parent.insertAdjacentElement('afterend', decodedDiv);
      }
    }
  });
}

// Run when page loads
processWPAHashes();

// Also observe for dynamic content changes
const observer = new MutationObserver(() => {
  processWPAHashes();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
