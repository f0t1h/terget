// Chrome only: the service worker can't reach the clipboard, so it opens this
// offscreen document to copy. navigator.clipboard needs a focused document,
// which an offscreen one never is; execCommand('copy') works with clipboardWrite.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== 'offscreen' || message.type !== 'copy') return;
  const textarea = document.getElementById('text');
  textarea.value = message.text;
  textarea.select();
  sendResponse(document.execCommand('copy'));
});
