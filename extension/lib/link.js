// Builds the request for a right-clicked link from what the browser would send
// when following it: the user agent, the default Referer, and the cookies for
// the link's site.

import { ext } from './ext.js';

/** Match pattern for the host permission needed to read `url`'s cookies. */
export function originPattern(url) {
  const { protocol, hostname } = new URL(url);
  return `${protocol}//${hostname}/*`;
}

/**
 * The Referer browsers send by default (strict-origin-when-cross-origin) when
 * a link on `pageUrl` is followed to `targetUrl`; '' when none is sent.
 */
export function defaultReferrer(pageUrl, targetUrl) {
  let page;
  let target;
  try {
    page = new URL(pageUrl);
    target = new URL(targetUrl);
  } catch {
    return '';
  }
  if (!/^https?:$/.test(page.protocol)) return '';
  if (page.protocol === 'https:' && target.protocol === 'http:') return '';
  if (page.origin !== target.origin) return `${page.origin}/`;
  page.hash = '';
  page.username = '';
  page.password = '';
  return page.href;
}

/**
 * Request spec ({ url, headers }) for a link.
 * @param {{linkUrl: string, pageUrl?: string, frameUrl?: string}} info menus.onClicked info
 * @param {{cookieStoreId?: string, incognito?: boolean}} tab tab the link is in
 * @param {{withCookies: boolean}} options false when cookie access wasn't granted
 */
export async function linkRequest({ linkUrl, pageUrl, frameUrl }, tab, { withCookies }) {
  const url = new URL(linkUrl);
  url.hash = '';
  const headers = [['User-Agent', navigator.userAgent]];
  const referrer = defaultReferrer(frameUrl ?? pageUrl, linkUrl);
  if (referrer) headers.push(['Referer', referrer]);
  if (withCookies) {
    const cookie = await cookieHeader(url.href, await cookieStoreFor(tab));
    if (cookie) headers.push(['Cookie', cookie]);
  }
  return { url: url.href, headers };
}

// Firefox reports the tab's cookie store (private window, container); Chrome
// only says whether the tab is private.
async function cookieStoreFor({ cookieStoreId, incognito }) {
  if (cookieStoreId) return cookieStoreId;
  if (!incognito) return undefined;
  const stores = await ext.cookies.getAllCookieStores();
  // Chrome's private-browsing store is "1".
  return stores.find((store) => store.incognito || store.id === '1')?.id;
}

async function cookieHeader(url, storeId) {
  const query = storeId ? { url, storeId } : { url };
  let cookies;
  try {
    cookies = await ext.cookies.getAll(query);
  } catch {
    // With Firefox's first-party isolation enabled, getAll requires firstPartyDomain.
    cookies = await ext.cookies.getAll({ ...query, firstPartyDomain: null });
  }
  return cookies.map((c) => (c.name ? `${c.name}=${c.value}` : c.value)).join('; ');
}
