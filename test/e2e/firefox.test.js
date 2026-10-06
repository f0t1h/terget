// End-to-end in a real (headless) Firefox, through the actual context menu;
// see suite.js for the scenarios. Set FIREFOX_BIN if Firefox is not in the
// default location. geckodriver is fetched automatically by Selenium Manager.

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { Builder, By } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';

import { defineSuite } from './suite.js';

const FIREFOX_BIN = process.env.FIREFOX_BIN
  ?? (process.platform === 'darwin' ? '/Applications/Firefox.app/Contents/MacOS/firefox' : 'firefox');
const EXTENSION_DIR = fileURLToPath(new URL('../../extension', import.meta.url));

async function inChrome(driver, script, ...args) {
  await driver.setContext(firefox.Context.CHROME);
  try {
    return await driver.executeScript(script, ...args);
  } finally {
    await driver.setContext(firefox.Context.CONTENT);
  }
}

defineSuite('Firefox', {
  skip: process.platform === 'darwin' && !existsSync(FIREFOX_BIN) && `Firefox not found at ${FIREFOX_BIN}`,

  async launch() {
    const options = new firefox.Options()
      .setBinary(FIREFOX_BIN)
      .addArguments('-headless')
      // Grant optional permissions (per-site cookie access) without the prompt.
      .setPreference('extensions.webextOptionalPermissionPrompts', false);
    // System access lets the test drive the browser's context menu.
    const service = new firefox.ServiceBuilder().addArguments('--allow-system-access');
    const driver = await new Builder().forBrowser('firefox').setFirefoxOptions(options).setFirefoxService(service).build();
    await driver.installAddon(EXTENSION_DIR, true);
    return { driver };
  },

  async copyLinkCommand({ driver }, link, tool) {
    const marker = `terget-e2e-${Date.now()}`;
    await inChrome(driver, (text) => navigator.clipboard.writeText(text), marker);
    await driver.actions().contextClick(driver.findElement(By.id(link.id))).perform();
    await inChrome(driver, (label) => {
      const menu = document.getElementById('contentAreaContextMenu');
      const item = [...menu.querySelectorAll('menuitem')]
        .find((m) => m.label === label && m.closest('menu')?.label === 'Copy download command');
      item.doCommand();
      menu.hidePopup();
    }, tool);
    let text;
    await driver.wait(async () => {
      text = await inChrome(driver, () => navigator.clipboard.readText());
      return text !== marker;
    }, 10_000, 'command copied to the clipboard');
    return text;
  },
});
