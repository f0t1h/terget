// Firefox provides the promise-based `browser` namespace; Chrome only has
// `chrome`, whose MV3 APIs also return promises.
export const ext = globalThis.browser ?? globalThis.chrome;
