import { ext } from './ext.js';

/** Copies `text`; resolves to whether it worked. */
export async function copyText(text) {
  try {
    if (ext.offscreen) {
      // Chrome's service worker has no DOM or clipboard access.
      await ext.offscreen.createDocument({
        url: ext.runtime.getURL('offscreen/offscreen.html'),
        reasons: ['CLIPBOARD'],
        justification: 'Copy the generated command to the clipboard',
      }).catch(() => {}); // already open
      const copied = await ext.runtime.sendMessage({ target: 'offscreen', type: 'copy', text });
      await ext.offscreen.closeDocument().catch(() => {});
      return copied === true;
    }
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
