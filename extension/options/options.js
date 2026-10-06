import { TOOLS } from '../lib/commands.js';
import { ext } from '../lib/ext.js';
import { loadSettings, saveSettings } from '../lib/settings.js';

const form = document.getElementById('form');
const extraEl = document.getElementById('extra');
const accessEl = document.getElementById('access');
const settings = await loadSettings();

for (const tool of TOOLS) {
  const input = Object.assign(document.createElement('input'), {
    type: 'text',
    id: `extra-${tool}`,
    value: settings.extraArgs[tool],
    spellcheck: false,
  });
  input.dataset.tool = tool;
  const label = Object.assign(document.createElement('label'), { htmlFor: input.id, textContent: tool });
  extraEl.append(label, input);
}

form.elements.shell.value = settings.shell;
form.elements.hideFromHistory.checked = settings.hideFromHistory;

form.addEventListener('change', save);
form.addEventListener('input', save);

function save() {
  const extraArgs = Object.fromEntries(
    [...extraEl.querySelectorAll('input')].map((input) => [input.dataset.tool, input.value]),
  );
  saveSettings({ shell: form.elements.shell.value, hideFromHistory: form.elements.hideFromHistory.checked, extraArgs });
}

const ALL_SITES = ['<all_urls>'];
const welcomeEl = document.getElementById('welcome');

// Must run straight from the click: browsers only show permission prompts for user actions.
async function allowAllSites() {
  await ext.permissions.request({ origins: ALL_SITES }).catch(() => false);
  await showAccess();
}
document.getElementById('allow-all').addEventListener('click', allowAllSites);
document.getElementById('welcome-allow').addEventListener('click', allowAllSites);

document.getElementById('revoke').addEventListener('click', async () => {
  const { origins = [] } = await ext.permissions.getAll();
  if (origins.length) await ext.permissions.remove({ origins }).catch(() => false);
  await showAccess();
});

async function showAccess() {
  const { origins = [] } = await ext.permissions.getAll();
  const allSites = origins.some((o) => o === '<all_urls>' || o === '*://*/*');
  if (allSites) {
    accessEl.textContent = 'Allowed on all sites.';
  } else if (origins.length) {
    accessEl.textContent = `Allowed on: ${origins.map((o) => o.replace(/^\w+:\/\/|\/\*$/g, '')).join(', ')}`;
  } else {
    accessEl.textContent = 'Not allowed on any site yet.';
  }
  // Opened by the background script right after installation.
  welcomeEl.hidden = location.hash !== '#welcome' || allSites;
}

ext.permissions.onAdded?.addListener(showAccess);
ext.permissions.onRemoved?.addListener(showAccess);
await showAccess();
