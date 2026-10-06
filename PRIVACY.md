# terget privacy policy

Last updated: 2026-10-05

terget turns a link you right-click into a `curl`, `wget` or `axel` command.
**Nothing leaves your device.** terget makes no network requests, has no
analytics or telemetry, loads no remote code, and shares nothing with the
developer or anyone else.

## What terget reads

Only when you choose **Copy download command** on a link:

- **The link's address** and the page it's on (for the `Referer` header).
- **Your browser's user agent string.**
- **The cookies your browser would send to the link's site**, if you've allowed
  terget to access that site: on all sites from the welcome page shown after
  installation, or per site when the browser asks the first time you copy a
  link from it. You can change this in terget's options.

terget does not watch your browsing, your requests or your downloads.

## What terget stores

- **Your options** (shell, history setting, extra arguments) in the browser's
  extension storage, on your device.
- Nothing else. The command is built, copied to your clipboard, and discarded.

## Clipboard

terget writes the command to your clipboard when you pick it from the menu.
It never reads the clipboard.

## Your responsibility

Commands contain your session cookies. Anyone who gets a command can act as
you on that site until the session expires, so treat commands like passwords.

## Limited Use

terget uses this information only to produce the command you ask for. Its use
of information received through browser extension APIs adheres to the
[Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies),
including the Limited Use requirements: the data is never transferred, sold,
used for advertising, or read by people.

## Changes

Changes to this policy are published in this file, and in the release notes of
the version that introduces them.
