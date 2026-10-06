// Browser-independent end-to-end scenarios. Each browser's test file supplies
// a launcher and a way to "right-click a link and copy a command"; the
// scenarios run the copied commands and check they download the same file
// with the site's HttpOnly session cookie, without the browser fetching the link.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { By } from 'selenium-webdriver';

// Characters that must survive shell quoting; the server rejects anything else.
const SESSION = `sid=s3'cr3t$x`;
export const ONCE_TOKEN = 'tok-8f2c';

const PAGE = `<!doctype html><meta charset="utf-8">
  <p><a id="get" href="/files/report.bin">report</a></p>
  <p><a id="once" href="/once/${ONCE_TOKEN}">single-use link</a></p>`;

/** The test site; also handy for trying the extension by hand in any browser. */
export function startServer(state, port = 0) {
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const hasSession = (req.headers.cookie ?? '').split('; ').includes(SESSION);
    const attachment = (name, body) => {
      res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.end(body);
    };

    if (url.pathname === '/') {
      res.setHeader('Set-Cookie', `${SESSION}; HttpOnly; SameSite=Lax; Path=/`);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(PAGE);
    } else if (!hasSession) {
      res.statusCode = 403;
      res.end('forbidden');
    } else if (url.pathname === '/files/report.bin') {
      attachment('report.bin', 'GET report.bin');
    } else if (url.pathname === `/once/${ONCE_TOKEN}` && state.onceHits++ === 0) {
      attachment('once.bin', 'ONCE');
    } else {
      res.statusCode = url.pathname.startsWith('/once/') ? 410 : 404;
      res.end();
    }
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => {
    resolve({ server, base: `http://127.0.0.1:${server.address().port}` });
  }));
}

/**
 * @param {string} name browser name for test titles
 * @param {object} options
 * @param {string|false} options.skip reason to skip, or false
 * @param {() => Promise<{driver}>} options.launch
 * @param {(browser, link: {id: string, url: string, pageUrl: string}, tool: string) => Promise<string>} options.copyLinkCommand
 *   right-clicks the link, picks Copy download command → tool, and returns the clipboard text
 */
export function defineSuite(name, { skip, launch, copyLinkCommand }) {
  const state = { onceHits: 0 };
  const workDirs = [];
  let server;
  let base;
  let browser;

  before(async () => {
    if (skip) return;
    ({ server, base } = await startServer(state));
    browser = await launch();
  });

  after(async () => {
    await browser?.driver.quit();
    server?.close();
    for (const dir of workDirs) rmSync(dir, { recursive: true, force: true });
  });

  async function run(command) {
    const dir = mkdtempSync(join(tmpdir(), 'terget-e2e-'));
    workDirs.push(dir);
    await promisify(execFile)('sh', ['-c', command], { cwd: dir, timeout: 30_000 });
    return dir;
  }

  const link = (id, path) => ({ id, url: `${base}${path}`, pageUrl: `${base}/` });

  test(`${name}: copied commands download the link with the site's HttpOnly cookie`, { skip, timeout: 120_000 }, async () => {
    // Visiting the page sets the session cookie the downloads require.
    await browser.driver.get(`${base}/`);
    for (const tool of ['curl', 'wget', 'axel']) {
      const command = await copyLinkCommand(browser, link('get', '/files/report.bin'), tool);
      assert.match(command, new RegExp(`^ ${tool} `), 'starts with a space (kept out of shell history)');
      assert.ok(command.includes(SESSION.replace("'", "'\\''")), `${tool} command carries the session cookie`);
      const dir = await run(command);
      assert.deepEqual(readdirSync(dir), ['report.bin'], tool);
      assert.equal(readFileSync(join(dir, 'report.bin'), 'utf8'), 'GET report.bin', tool);
    }
  });

  test(`${name}: copying a single-use link doesn't use it up`, { skip, timeout: 60_000 }, async () => {
    await browser.driver.get(`${base}/`);
    const command = await copyLinkCommand(browser, link('once', `/once/${ONCE_TOKEN}`), 'curl');
    assert.equal(state.onceHits, 0, 'the browser did not fetch the link');
    const dir = await run(command);
    assert.equal(readFileSync(join(dir, 'once.bin'), 'utf8'), 'ONCE');
  });

  test(`${name}: install opens a welcome page whose button allows all sites at once`, { skip, timeout: 60_000 }, async () => {
    const { driver } = browser;
    const original = await driver.getWindowHandle();
    let welcome;
    for (const handle of await driver.getAllWindowHandles()) {
      await driver.switchTo().window(handle);
      if ((await driver.getCurrentUrl()).endsWith('/options/options.html#welcome')) welcome = handle;
    }
    assert.ok(welcome, 'welcome tab opened on install');
    await driver.switchTo().window(welcome);
    // Earlier tests granted single sites only, so the banner still shows.
    assert.equal(await driver.findElement(By.id('welcome')).isDisplayed(), true);
    await driver.findElement(By.id('welcome-allow')).click();
    await driver.wait(async () => !(await driver.findElement(By.id('welcome')).isDisplayed()), 5_000, 'banner hidden');
    assert.equal(await driver.findElement(By.id('access')).getText(), 'Allowed on all sites.');
    await driver.switchTo().window(original);
  });
}
