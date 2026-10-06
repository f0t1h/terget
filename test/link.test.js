import { test } from 'node:test';
import assert from 'node:assert/strict';

import { defaultReferrer, originPattern } from '../extension/lib/link.js';

test('defaultReferrer follows strict-origin-when-cross-origin', () => {
  assert.equal(defaultReferrer('https://u:p@a.example/page?q=1#x', 'https://a.example/f'), 'https://a.example/page?q=1');
  assert.equal(defaultReferrer('https://a.example/page?q=1', 'https://cdn.example/f'), 'https://a.example/');
  assert.equal(defaultReferrer('https://a.example/page', 'http://a.example/f'), '');
  assert.equal(defaultReferrer('about:blank', 'https://a.example/f'), '');
});

test('originPattern asks for the link host on any port, without credentials or path', () => {
  assert.equal(originPattern('https://u:p@files.example.com:8443/a/b?c#d'), 'https://files.example.com/*');
  assert.equal(originPattern('http://127.0.0.1:8765/x'), 'http://127.0.0.1/*');
});
