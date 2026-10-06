// Argument quoting for the shells commands are generated for.

export const SHELLS = ['posix', 'powershell'];

// Never needs quoting in sh, bash, zsh or fish. A leading '=' is excluded
// because zsh expands `=word` to a command path.
const SAFE_POSIX = /^[A-Za-z0-9_@+:,./-][A-Za-z0-9_@+=:,./-]*$/;

/**
 * Quote for sh, bash, zsh and fish. Single quotes keep everything literal in
 * all four, except that fish also treats \\ and \' as escapes inside them, so
 * both ' and \ are emitted outside the quotes as \' and \\.
 */
export function quotePosix(arg) {
  const s = String(arg);
  if (s === '') return "''";
  if (SAFE_POSIX.test(s)) return s;
  return `'${s.replace(/['\\]/g, (c) => `'\\${c}'`)}'`;
}

// No ',' (array), '@' (splatting), '$', quotes, braces or parens.
const SAFE_POWERSHELL = /^[A-Za-z0-9_./:=+-]+$/;

/**
 * Quote for PowerShell 7.3+, whose native-command argument passing keeps
 * embedded double quotes intact. Inside '...' only quote characters are
 * special; PowerShell also treats the Unicode single quotes as quotes.
 */
export function quotePowerShell(arg) {
  const s = String(arg);
  if (s === '') return "''";
  if (SAFE_POWERSHELL.test(s)) return s;
  return `'${s.replace(/['\u2018\u2019\u201A\u201B]/g, (c) => c + c)}'`;
}
