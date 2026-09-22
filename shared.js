/* Shared by extension pages, the worker and the isolated content-script world. */
(() => {
  const HOME = 'https://notebook.google.com/';
  const ORIGINS = ['https://notebooklm.google.com', 'https://notebook.google.com'];
  function isNotebook(value) {
    try { return ORIGINS.includes(new URL(value).origin); } catch { return false; }
  }
  function notebookURL(value) {
    const url = new URL(value);
    if (!isNotebook(value) || url.username || url.password ||
        !/^\/(?:u\/\d+\/)?(?:notebook\/[a-zA-Z0-9_-]+\/?|)$/.test(url.pathname)) {
      throw new Error('Paste a NotebookLM home or notebook URL from notebook.google.com or notebooklm.google.com.');
    }
    const account = url.searchParams.get('authuser');
    url.hash = ''; url.search = '';
    if (account && /^\d+$/.test(account)) url.searchParams.set('authuser', account);
    return url.href;
  }
  globalThis.Companion = { HOME, ORIGINS, isNotebook, notebookURL,
    defaults: { notebookUrl: HOME, compact: true, embed: false, theme: 'system' },
    api: globalThis.browser || globalThis.chrome };
})();
