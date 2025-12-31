// Default domains
const DEFAULT_DOMAINS = ['hashtopolis.*'];

// Load saved settings
function loadSettings() {
  chrome.storage.sync.get(['allowedDomains'], function(result) {
    const domains = result.allowedDomains || DEFAULT_DOMAINS;
    document.getElementById('domains').value = domains.join('\n');
  });
}

// Save settings
function saveSettings() {
  const domainsText = document.getElementById('domains').value;
  const domains = domainsText.split('\n')
    .map(d => d.trim())
    .filter(d => d.length > 0);
  
  chrome.storage.sync.set({
    allowedDomains: domains.length > 0 ? domains : DEFAULT_DOMAINS
  }, function() {
    // Show status message
    const status = document.getElementById('status');
    status.textContent = 'Settings saved!';
    status.style.display = 'block';
    setTimeout(() => {
      status.style.display = 'none';
    }, 2000);
  });
}

// Reset to default
function resetSettings() {
  document.getElementById('domains').value = DEFAULT_DOMAINS.join('\n');
  saveSettings();
}

// Event listeners
document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('save').addEventListener('click', saveSettings);
document.getElementById('reset').addEventListener('click', resetSettings);
