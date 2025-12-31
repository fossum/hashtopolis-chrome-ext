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

    // Also observe for dynamic content changes
    const observer = new MutationObserver(() => {
      processWPAHashes();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
});
