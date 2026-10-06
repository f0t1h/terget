// Right-click a link → "Copy download command" → curl / wget / axel.
// Nothing runs until a menu item is clicked; cookies are read only for the
// clicked link's site, and only once the user has allowed that site.

import { TOOLS, buildCommand } from './lib/commands.js';
import { copyText } from './lib/clipboard.js';
import { ext } from './lib/ext.js';
import { linkRequest, originPattern } from './lib/link.js';
import { commandOptions, loadSettings } from './lib/settings.js';

const MENU_ID = 'copy-command';
const menus = ext.menus ?? ext.contextMenus;
const HTTP_LINKS = ['http://*/*', 'https://*/*'];

ext.runtime.onInstalled.addListener(({ reason }) => {
  menus.create({ id: MENU_ID, title: 'Copy download command', contexts: ['link'], targetUrlPatterns: HTTP_LINKS });
  for (const tool of TOOLS) {
    menus.create({ id: `${MENU_ID}:${tool}`, parentId: MENU_ID, title: tool, contexts: ['link'], targetUrlPatterns: HTTP_LINKS });
  }
  // Ask for cookie access once, up front; per-site prompts remain the fallback.
  if (reason === 'install') ext.tabs.create({ url: ext.runtime.getURL('options/options.html#welcome') });
});

ext.action.onClicked.addListener(() => ext.runtime.openOptionsPage());

menus.onClicked.addListener((info, tab) => {
  const tool = String(info.menuItemId).split(':')[1];
  if (!TOOLS.includes(tool) || !info.linkUrl) return;
  // Browsers only allow permission requests while handling the click, so ask
  // before anything else is awaited. Resolves at once if already allowed.
  const access = ext.permissions.request({ origins: [originPattern(info.linkUrl)] }).catch(() => false);
  copyLinkCommand(info, tab ?? {}, tool, access);
});

async function copyLinkCommand(info, tab, tool, access) {
  const withCookies = await access;
  const host = new URL(info.linkUrl).hostname;
  try {
    const request = await linkRequest(info, tab, { withCookies });
    const command = buildCommand(tool, request, commandOptions(await loadSettings(), tool));
    if (!await copyText(command)) {
      await feedback(tab, false, "Couldn't copy to the clipboard");
    } else if (!withCookies) {
      await feedback(tab, false, `Copied without cookies: terget isn't allowed to read cookies for ${host}`);
    } else {
      await feedback(tab, true, `Copied ${tool} command for ${host}`);
    }
  } catch (error) {
    await feedback(tab, false, `Couldn't build the command: ${error.message}`);
  }
}

// Shows the outcome on the toolbar button for a few seconds.
async function feedback(tab, ok, title) {
  const tabId = tab.id;
  if (tabId === undefined) return;
  await ext.action.setBadgeBackgroundColor({ tabId, color: ok ? '#2da44e' : '#cf222e' });
  await ext.action.setBadgeText({ tabId, text: ok ? '✓' : '!' });
  await ext.action.setTitle({ tabId, title: `terget: ${title}` });
  setTimeout(() => {
    ext.action.setBadgeText({ tabId, text: '' }).catch(() => {});
    ext.action.setTitle({ tabId, title: 'terget' }).catch(() => {});
  }, ok ? 3000 : 8000);
}
