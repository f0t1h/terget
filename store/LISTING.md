# Store listings

Copy-paste text for addons.mozilla.org, the Chrome Web Store and Edge Add-ons.
Packages (`npm run package`): `dist/terget-<version>-firefox.zip` for
addons.mozilla.org, `dist/terget-<version>-chrome.zip` for the Chrome Web Store
and Edge Add-ons.
Privacy policy: <https://github.com/f0t1h/terget/blob/main/PRIVACY.md> (Chrome
and Edge need the URL; on addons.mozilla.org paste the text into the privacy
policy field).

**Images** (regenerate with `npm run icons`):

| File | Size | Used by |
|---|---|---|
| `extension/icons/icon-128.png` | 128×128 | AMO and Chrome take it from the package; upload it as the Chrome store icon if asked |
| `store/logo-300.png` | 300×300 | Edge: extension logo (required) |
| `store/promo-440x280.png` | 440×280 | Chrome: small promo tile (required); Edge: small promotional tile |
| `store/screenshots/*.png` | 1280×800 | All three |

Sources: `store/icon.svg`, `store/icon-16.svg` (pixel-tuned 16 px), `store/promo.svg`.

## Common

**Name:** terget

**Summary / short description** (manifest description, 102 characters):

> Right-click a link to copy a curl, wget or axel command that downloads it with your browser's cookies.

**Description:**

> Right-click any link → "Copy download command" → curl, wget or axel. Paste the command into a terminal and it downloads the file with the same cookies, user agent and referer your browser would send, so downloads behind a login work on the command line or a server.
>
> • Nothing runs until you click the menu. terget doesn't watch your browsing or your downloads.
> • Reads cookies only for the clicked link's site, and only for sites you allow: all at once on the welcome page after installing, or one at a time when first used.
> • The browser never fetches the link, so single-use links stay unused (use curl or wget for those).
> • Quoting for bash, zsh, sh and fish, or PowerShell 7.3+.
> • Optional: keep commands out of shell history; extra arguments per tool.
>
> No network requests, no analytics, nothing stored except your options.
>
> Commands contain your live session cookies. Treat them like passwords.

**Category:** Firefox: *Download Management*. Chrome: *Developer Tools*. Edge: *Developer tools*.

## Firefox (addons.mozilla.org)

Upload `dist/terget-<version>-firefox.zip` as a new version of the existing
add-on and choose **On this site** to list it; it keeps the add-on ID.

- **Source code:** not needed; nothing is minified, bundled or generated.
- **License:** MIT.
- **Compatibility:** Firefox desktop only. Firefox for Android has no context
  menus for extensions, so leave Android unticked. Validation may still warn
  that `strict_min_version` predates Android support for
  `data_collection_permissions`; that's harmless for a desktop-only add-on.

**Release notes 0.2.1:**

> First public release.

**Notes to reviewer:**

> terget adds "Copy download command" to the link context menu. On click it requests the optional host permission for the link's origin (permissions.request inside the menus.onClicked handler), reads that origin's cookies with cookies.getAll, builds a curl/wget/axel command and writes it to the clipboard. On first install it opens its options page with an "Allow on all sites" button (permissions.request on click) so users can grant access once instead of per site. There are no other listeners and no network requests.
>
> To test: open a site where you're logged in, right-click a download link → Copy download command → curl, allow the site, and run the command in a terminal.

## Chrome Web Store

Upload `dist/terget-<version>-chrome.zip`.

**Single purpose:**

> Copy a curl, wget or axel command that downloads a right-clicked link with the browser's cookies.

**Permission justifications:**

| Permission | Justification |
|---|---|
| `contextMenus` | Adds "Copy download command" to the link context menu, the extension's only entry point. |
| `cookies` | Reads the cookies for the clicked link's site so the command can download it as the logged-in user. |
| `clipboardWrite` | Copies the generated command to the clipboard. |
| `offscreen` | The service worker can't access the clipboard; an offscreen document performs the copy. |
| `storage` | Saves the user's options (shell, history setting, extra arguments). |
| Optional host permissions (`<all_urls>`) | Cookie access. Nothing is granted at install: the welcome page opened after installation offers one "Allow on all sites" prompt, and otherwise access is requested per site the first time the user copies a link from it. Downloads can be on any site, so any site may be requested. |

**Remote code:** No, I am not using remote code.

**Data usage** (tick; stays on the device):

- [x] Authentication information: the clicked site's cookies are put into the command.
- [x] Web history: the link's URL and the page it's on are put into the command.

Certify all three: not sold to third parties; not used or transferred for
purposes unrelated to the single purpose; not used to determine
creditworthiness or for lending.

**Privacy policy URL:** <https://github.com/f0t1h/terget/blob/main/PRIVACY.md>

## Microsoft Edge Add-ons

Upload `dist/terget-<version>-chrome.zip` in Partner Center. Use the Common description, the Chrome
permission justifications as **Notes for certification**, and the same privacy
policy URL.
