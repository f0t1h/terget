import { TOOLS } from './commands.js';
import { ext } from './ext.js';
import { SHELLS } from './shell.js';

export const DEFAULT_SETTINGS = Object.freeze({
  shell: 'posix',
  hideFromHistory: true,
  extraArgs: Object.freeze(Object.fromEntries(TOOLS.map((tool) => [tool, '']))),
});

export async function loadSettings() {
  const { settings = {} } = await ext.storage.local.get('settings');
  return {
    shell: SHELLS.includes(settings.shell) ? settings.shell : DEFAULT_SETTINGS.shell,
    hideFromHistory: typeof settings.hideFromHistory === 'boolean' ? settings.hideFromHistory : DEFAULT_SETTINGS.hideFromHistory,
    extraArgs: { ...DEFAULT_SETTINGS.extraArgs, ...settings.extraArgs },
  };
}

export async function saveSettings(patch) {
  const current = await loadSettings();
  await ext.storage.local.set({ settings: { ...current, ...patch } });
}

/** buildCommand() options for `tool` under `settings`. */
export function commandOptions(settings, tool) {
  return {
    shell: settings.shell,
    hideFromHistory: settings.hideFromHistory,
    extraArgs: settings.extraArgs[tool],
  };
}
