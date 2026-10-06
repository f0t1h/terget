# <img src="store/icon.svg" width="40" height="40" align="top" alt=""> terget

terget is a Firefox and Chrome extension that turns a link into a `curl`,
`wget` or `axel` command. The command sends the same cookies (including
HttpOnly ones), user agent and referer as your browser, so a file that needs
you to be logged in downloads the same way from a terminal or a server.

It follows the idea of [cliget](https://github.com/zaidka/cliget) with a
smaller footprint: it doesn't watch your downloads, keeps no history, and has
no access to any site until you allow it.

The name plays on *target* and on Turkish *terk et* ("leave"): the download
leaves the browser for the terminal.

## Install

Requires Firefox 140+, or Chrome 121+ (and other Chromium browsers such as
Edge and Brave).

- **Firefox**: not yet listed on addons.mozilla.org. To try it from source,
  open `about:debugging#/runtime/this-firefox`, click **Load Temporary
  Add-on…** and select `extension/manifest.json`. Firefox removes it again
  on restart.
- **Chrome, Edge, Brave**: open `chrome://extensions` (`edge://extensions`,
  `brave://extensions`), turn on **Developer mode**, click **Load unpacked**
  and select the `extension/` folder.

## Usage

### First run

After installation, terget opens a welcome page. Click **Allow on all
sites** to give it cookie access once. If you skip this, your browser asks
the first time you copy a link from each site.

### Copying a command

1. Right-click a link and choose **Copy download command**, then **curl**,
   **wget** or **axel**.
2. Paste the command into a terminal.

The toolbar button shows ✓ when the command is copied, or ! when something
went wrong; hover over it for the reason. For example, if cookie access
wasn't allowed, the command is copied without cookies.

### Options

Click the toolbar button to open the options:

- **Shell**: sh, bash, zsh and fish, or PowerShell 7.3+.
- **Shell history**: start commands with a space so bash and zsh can keep
  them out of your history. On by default.
- **Extra arguments**: added to every command for a tool, for example `-n 8`
  for axel.
- **Cookie access**: allow all sites, or remove access from every site.

## Privacy

terget reads cookies only when you use the menu, only for the clicked
link's site, and only if you've allowed that site. It stores nothing except
your options and sends nothing anywhere. See [PRIVACY.md](PRIVACY.md).

Commands contain your live session cookies. Treat them like passwords.

## Limitations

- **Plain link downloads only.** A command is a GET request with the cookies,
  user agent and default referer. Downloads that need a submitted form,
  custom headers, a password typed into the browser's login prompt, or a
  page script (`blob:` links) won't work. Credentials in the link itself
  (`https://user:password@host/…`) do work.
- **Single-use links need curl or wget.** The browser never fetches the link,
  so it stays unused until you run the command. axel makes several requests
  per download, so the second one fails.

## Development

Requires Node.js 20+. The `extension/` folder is the package for both
browsers; there is no build step.

```sh
npm install
npm test           # command and quoting tests; runs curl, wget and axel against a local server
npm run test:e2e   # headless Firefox: real context menu → clipboard → run the command
npm run package    # dist/terget-<version>-firefox.zip (addons.mozilla.org) and -chrome.zip (Chrome Web Store, Edge Add-ons)
npm run icons      # extension/icons/*.png from store/icon.svg and store/icon-16.svg (needs rsvg-convert)
```

Store descriptions, permission justifications and screenshots are in
[store/](store/).

## License

[MIT](LICENSE)
