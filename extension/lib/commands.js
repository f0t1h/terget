// Turns a link request into curl / wget / axel command lines.
//
// Request spec (from link.js): { url, headers: [[name, value], ...] }, always a GET.

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
