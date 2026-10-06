#!/usr/bin/env node
// Writes dist/terget-<version>-firefox.zip and dist/terget-<version>-chrome.zip
// from extension/. The source manifest serves both browsers (so extension/
// loads unpacked in either); each zip drops the keys the other browser needs,
// which the stores' validators would otherwise flag.

import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(readFileSync(join(root, 'extension/manifest.json'), 'utf8'));
const dist = join(root, 'dist');
mkdirSync(dist, { recursive: true });

const targets = {
  // Firefox: event page (background.scripts); no offscreen API.
  firefox({ minimum_chrome_version, background: { service_worker, ...background }, ...m }) {
    return { ...m, background, permissions: m.permissions.filter((p) => p !== 'offscreen') };
  },
  // Chrome: service worker; no Firefox-specific keys.
  chrome({ browser_specific_settings, background: { scripts, ...background }, ...m }) {
    return { ...m, background };
  },
};

for (const [name, transform] of Object.entries(targets)) {
  const dir = mkdtempSync(join(tmpdir(), `terget-${name}-`));
  cpSync(join(root, 'extension'), dir, {
    recursive: true,
    filter: (src) => name === 'chrome' || !src.includes('/offscreen'),
  });
  writeFileSync(join(dir, 'manifest.json'), `${JSON.stringify(transform(manifest), null, 2)}\n`);
  const zip = join(dist, `terget-${manifest.version}-${name}.zip`);
  rmSync(zip, { force: true });
  execFileSync('zip', ['-qrX', zip, '.', '-x', '.*'], { cwd: dir });
  rmSync(dir, { recursive: true });
  console.log(`dist/terget-${manifest.version}-${name}.zip`);
}
