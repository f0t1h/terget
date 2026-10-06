import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:http';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { quotePosix, quotePowerShell } from '../extension/lib/shell.js';
import { buildArgv, buildCommand } from '../extension/lib/commands.js';

function which(tool) {
  try {
    return execFileSync('sh', ['-c', `command -v ${tool}`], { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}
const hasTool = (tool) => which(tool) !== null;
const PWSH = process.env.PWSH_BIN ?? which('pwsh');
const POSIX_SHELLS = ['sh', 'bash', 'zsh', 'dash', 'fish'].filter(hasTool);

// Runs a command line in `shell`; PowerShell goes through pwsh.
function shellArgs(shell, command) {
  return shell === 'powershell' ? [PWSH, ['-NoProfile', '-NonInteractive', '-Command', command]] : [shell, ['-c', command]];
}

// ---------------------------------------------------------------------------
// Shell quoting

const SAMPLES = ['', 'plain', "it's", "''", 'a b', '$HOME', '$(id)', '`id`', '!x', 'a\nb', '\\', 'a\\\\b', "\\'", '*', '-rf',
  '=ls', '~', 'ü 😀', '"q"', '\u2019x\u2018', ';|&<>(){},@%#', 'a=b&c=d?e'];

// A native program prints the argv it received, so this checks what the
// shell actually passes to curl/wget/axel, not just what it echoes.
const ECHO_ARGV = `${quotePosix(process.execPath)} -e 'process.stdout.write(JSON.stringify(process.argv.slice(1)))'`;

for (const shell of POSIX_SHELLS) {
  test(`quotePosix: ${shell} passes every argument through unchanged`, () => {
    const out = execFileSync(shell, ['-c', `${ECHO_ARGV} ${SAMPLES.map(quotePosix).join(' ')}`], { encoding: 'utf8' });
    assert.deepEqual(JSON.parse(out), SAMPLES);
  });
}

test('quotePowerShell: pwsh passes every argument through unchanged', { skip: !PWSH && 'pwsh not installed (set PWSH_BIN)' }, () => {
  const node = `& ${quotePowerShell(process.execPath)} -e 'process.stdout.write(JSON.stringify(process.argv.slice(1)))'`;
  const out = execFileSync(...shellArgs('powershell', `${node} ${SAMPLES.map(quotePowerShell).join(' ')}`), { encoding: 'utf8' });
  assert.deepEqual(JSON.parse(out), SAMPLES);
});

// ---------------------------------------------------------------------------
// Argument construction

const SPEC = { url: 'https://example.org/f.zip', headers: [['User-Agent', 'UA/1'], ['Cookie', 'sid=1']] };

test('user:password@ in the URL becomes an Authorization header for every tool', () => {
  for (const tool of ['curl', 'wget', 'axel']) {
    const argv = buildArgv(tool, { url: 'https://u%40x:p%20w@example.org/f', headers: [] });
    assert.equal(argv.at(-1), 'https://example.org/f', tool);
    assert.ok(argv.includes(`Authorization: Basic ${btoa('u@x:p w')}`), tool);
  }
});

test('extra arguments go verbatim before the URL', () => {
  const command = buildCommand('axel', SPEC, { extraArgs: ' -n 8 ' });
  assert.ok(command.endsWith(' -n 8 https://example.org/f.zip'), command);
});

test('hideFromHistory prefixes POSIX commands with a space; PowerShell ignores it', () => {
  assert.ok(buildCommand('curl', SPEC, { hideFromHistory: true }).startsWith(' curl '));
  assert.ok(buildCommand('curl', SPEC, { hideFromHistory: true, shell: 'powershell' }).startsWith('curl '));
});

// ---------------------------------------------------------------------------
// Real tools against a local server

let server;
let baseUrl;
let dir;
const received = [];

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'terget-test-'));
  server = createServer((req, res) => {
    received.push({ url: req.url, headers: req.headers });
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="served.bin"');
    res.end('payload');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  rmSync(dir, { recursive: true, force: true });
});

const TRICKY = `a'b "c" $HOME \`id\` \\n ü`;
const RUN_SHELLS = ['sh', ...(hasTool('zsh') ? ['zsh'] : []), ...(hasTool('fish') ? ['fish'] : []), ...(PWSH ? ['powershell'] : [])];

for (const shell of RUN_SHELLS) {
  for (const tool of ['curl', 'wget', 'axel']) {
    test(`${shell}/${tool}: replays cookies, user agent and referer exactly`, { skip: !hasTool(tool) && `${tool} not installed` }, async () => {
      received.length = 0;
      const work = mkdtempSync(join(dir, `${tool}-`));
      const command = buildCommand(tool, {
        url: `${baseUrl}/dl/report.bin?x=1&y=2`,
        headers: [['User-Agent', 'Mozilla/5.0 test'], ['Referer', `${baseUrl}/page`], ['Cookie', `sid=${TRICKY}`]],
      }, { shell: shell === 'powershell' ? 'powershell' : 'posix', hideFromHistory: true });
      // Async: the server runs in this process, so a blocking spawn would deadlock.
      await promisify(execFile)(...shellArgs(shell, command), { cwd: work, timeout: 15_000 });

      const [file] = readdirSync(work);
      assert.equal(file, 'served.bin', 'file named by Content-Disposition');
      assert.equal(readFileSync(join(work, file), 'utf8'), 'payload');
      const req = received.at(-1);
      assert.equal(req.url, '/dl/report.bin?x=1&y=2');
      assert.equal(req.headers['user-agent'], 'Mozilla/5.0 test');
      assert.equal(req.headers.referer, `${baseUrl}/page`);
      assert.equal(Buffer.from(req.headers.cookie, 'latin1').toString('utf8'), `sid=${TRICKY}`);
    });
  }
}
