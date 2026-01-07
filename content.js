// Main content script - coordinates hashes and cracks page functionality

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

// Function to decode hex to ASCII (shared utility)
function hex2a(hex) {
  var str = '';
  for (var i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return str;
}

// Main toggle function that coordinates both page types
function toggleConversion(enabled) {
  console.log('[WPA ESSID Decoder] Toggle conversion:', enabled);

  // Check if we have functions from hashes.js
  if (typeof toggleHashesConversion === 'function') {
    toggleHashesConversion(enabled);
  }

  // Check if we have functions from cracks.js
  if (typeof toggleCracksConversion === 'function') {
    toggleCracksConversion(enabled);
  }
}

// Initialize extension
chrome.storage.sync.get(['allowedDomains'], function(result) {
  const allowedDomains = result.allowedDomains || ['hashtopolis.*'];

  // Only run if current domain is allowed
  if (isDomainAllowed(allowedDomains)) {
    // Run when page loads
    if (typeof processWPAHashes === 'function') processWPAHashes();
    if (typeof addSSIDColumn === 'function') addSSIDColumn();
    if (typeof addConversionToggleControl === 'function') addConversionToggleControl();
    if (typeof addDuplicateRemovalControl === 'function') addDuplicateRemovalControl();

    // Also observe for dynamic content changes
    const observer = new MutationObserver(() => {
      if (typeof processWPAHashes === 'function') processWPAHashes();
      if (typeof addSSIDColumn === 'function') addSSIDColumn();
      if (typeof addConversionToggleControl === 'function') addConversionToggleControl();
      if (typeof addDuplicateRemovalControl === 'function') addDuplicateRemovalControl();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
});
