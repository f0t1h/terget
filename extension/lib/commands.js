// Turns a link into a shell command that downloads it.
//
// http(s) links: a curl / wget / axel command for the request spec from
// link.js, { url, headers: [[name, value], ...] }, always a GET.
// data: links: the content is in the link itself, so the command writes it to
// a file instead.

import { quotePosix, quotePowerShell } from './shell.js';

export const TOOLS = ['curl', 'wget', 'axel'];

/**
 * @param {string} tool one of TOOLS
 * @param {{url: string, headers: [string, string][]}} spec
 * @returns {string[]} argv; the file name comes from the server
 */
export function buildArgv(tool, spec) {
  const { url, headers } = moveUrlCredentials(spec.url, spec.headers);
  const userAgent = headers.find(([name]) => name.toLowerCase() === 'user-agent')?.[1];
  const rest = headers.filter(([name]) => name.toLowerCase() !== 'user-agent');
  const headerArgs = (flag) => rest.flatMap(([name, value]) => [flag, `${name}: ${value}`]);

  switch (tool) {
    case 'curl':
      return ['curl', '-L', '-O', '-J', ...headerArgs('-H'), ...(userAgent ? ['-A', userAgent] : []), url];
    case 'wget':
      return ['wget', '--content-disposition', ...(userAgent ? ['-U', userAgent] : []), ...headerArgs('--header'), url];
    case 'axel':
      return ['axel', ...(userAgent ? ['-U', userAgent] : []), ...headerArgs('-H'), url];
    default:
      throw new Error(`unknown tool: ${tool}`);
  }
}

/**
 * Tools disagree on percent-decoding user:password@ in URLs (axel sends it
 * raw), so credentials go into an Authorization header instead.
 */
function moveUrlCredentials(rawUrl, headers) {
  const url = new URL(rawUrl);
  if (!url.username && !url.password) return { url: rawUrl, headers };
  const credentials = `${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`;
  url.username = '';
  url.password = '';
  const basic = btoa(String.fromCharCode(...new TextEncoder().encode(credentials)));
  return { url: url.href, headers: [...headers, ['Authorization', `Basic ${basic}`]] };
}

/**
 * Command line for `shell` ('posix' covers sh/bash/zsh/fish; 'powershell' is 7.3+).
 * `extraArgs` is inserted verbatim before the URL. `hideFromHistory` prefixes a
 * space, which bash (HISTCONTROL=ignorespace) and zsh (HIST_IGNORE_SPACE) keep
 * out of history.
 */
export function buildCommand(tool, spec, { extraArgs = '', shell = 'posix', hideFromHistory = false } = {}) {
  const quote = shell === 'powershell' ? quotePowerShell : quotePosix;
  const quoted = buildArgv(tool, spec).map(quote);
  const extra = extraArgs.trim();
  if (extra) quoted.splice(quoted.length - 1, 0, extra);
  const command = quoted.join(' ');
  return hideFromHistory && shell === 'posix' ? ` ${command}` : command;
}

// String.fromCharCode(...bytes) overflows the call stack on large arrays.
function binaryString(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return out;
}

// Larger embedded files make an unwieldy command.
export const MAX_DATA_BYTES = 1024 * 1024;

const EXTENSIONS = {
  'text/plain': 'txt',
  'text/csv': 'csv',
  'text/html': 'html',
  'application/json': 'json',
  'application/pdf': 'pdf',
  'application/zip': 'zip',
  'application/octet-stream': 'bin',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/svg+xml': 'svg',
};

/**
 * Decodes a data: URL as browsers do: the part before the comma is the media
 * type (text/plain when empty) with an optional ;base64 flag; the rest is
 * percent-encoded bytes, then base64-decoded if flagged.
 * @returns {{mediaType: string, bytes: Uint8Array}}
 */
export function parseDataUrl(url) {
  const body = url.slice('data:'.length).split('#')[0];
  const comma = body.indexOf(',');
  if (comma === -1) throw new Error('not a valid data: link');
  let type = body.slice(0, comma).trim();
  const base64 = /;\s*base64\s*$/i.test(type);
  if (base64) type = type.replace(/;\s*base64\s*$/i, '');
  let bytes = percentDecode(body.slice(comma + 1));
  if (base64) {
    const text = binaryString(bytes).replace(/[\t\n\f\r ]/g, '');
    bytes = Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
  }
  const mediaType = type.split(';')[0].trim().toLowerCase() || 'text/plain';
  return { mediaType, bytes };
}

function percentDecode(text) {
  const input = new TextEncoder().encode(text);
  const out = [];
  const hex = (b) => (b >= 0x30 && b <= 0x39) || (b >= 0x41 && b <= 0x46) || (b >= 0x61 && b <= 0x66);
  for (let i = 0; i < input.length; i++) {
    if (input[i] === 0x25 && hex(input[i + 1]) && hex(input[i + 2])) {
      out.push(parseInt(String.fromCharCode(input[i + 1], input[i + 2]), 16));
      i += 2;
    } else {
      out.push(input[i]);
    }
  }
  return Uint8Array.from(out);
}

/** download.<ext> for the media type; plain "download" when unknown. */
export function dataFilename(mediaType) {
  const extension = EXTENSIONS[mediaType];
  return extension ? `download.${extension}` : 'download';
}

/**
 * A command that writes the content of a data: link to a file.
 * @returns {{command: string, filename: string}}
 */
export function buildDataCommand(url, { shell = 'posix', hideFromHistory = false } = {}) {
  const { mediaType, bytes } = parseDataUrl(url);
  if (bytes.length > MAX_DATA_BYTES) {
    throw new Error(`the link holds ${bytes.length} bytes; at most ${MAX_DATA_BYTES} fit in a command`);
  }
  const filename = dataFilename(mediaType);
  if (shell === 'powershell') {
    const base64 = btoa(binaryString(bytes));
    return { filename, command: `[IO.File]::WriteAllBytes("$PWD/${filename}", [Convert]::FromBase64String('${base64}'))` };
  }
  const command = `printf ${printfLiteral(bytes)} > ${quotePosix(filename)}`;
  return { filename, command: hideFromHistory ? ` ${command}` : command };
}

/**
 * A single-quoted printf format that outputs exactly `bytes` in sh, bash, zsh,
 * dash and fish. Printable ASCII stays readable; bytes that are special to
 * printf or to quoting (% \ ' and a leading -) and everything else become
 * 3-digit octal escapes.
 */
export function printfLiteral(bytes) {
  let out = '';
  for (const b of bytes) {
    const plain = b >= 0x20 && b < 0x7f && !'%\\\'-'.includes(String.fromCharCode(b));
    out += plain ? String.fromCharCode(b) : `\\${b.toString(8).padStart(3, '0')}`;
  }
  return `'${out}'`;
}
