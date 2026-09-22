(() => {
  const { api, defaults, notebookURL } = Companion;
  let sidebar = false, popout = false, companion = false, lastURL = '', compact = true, theme = 'system';
  const embedded = window !== window.top && (
    document.referrer.startsWith(api.runtime.getURL('')) ||
    Array.from(location.ancestorOrigins || []).includes(new URL(api.runtime.getURL('')).origin));
  function update() {
    Companion.renderPopoutControls((popout || sidebar) && window === window.top, compact, theme, sidebar ? 'Sidebar' : 'Floating');
    document.documentElement.classList.toggle('nfc-compact', companion && compact);
    if (!companion || location.href === lastURL) return;
    lastURL = location.href;
    let url;
    try { url = notebookURL(location.href); } catch { return; }
    if (embedded) window.parent.postMessage({ type: 'notebook-companion-ready', url }, '*');
    else if (url.includes('/notebook/')) api.storage.local.set({ notebookUrl: url }).catch(() => {});
  }
  async function context() {
    const [result, settings] = await Promise.all([
      api.runtime.sendMessage({ type: 'context' }), api.storage.local.get(defaults)
    ]);
    popout = result?.popout === true;
    sidebar = result?.sidebar === true;
    companion = embedded || popout || result?.sidebar === true;
    compact = settings.compact; theme = settings.theme; update();
  }
  api.runtime.onMessage.addListener(message => {
    if (message.type === 'refresh-context') context().catch(() => {});
  });
  api.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.compact) compact = changes.compact.newValue;
    if (changes.theme) theme = changes.theme.newValue;
    if (changes.compact || changes.theme) update();
  });
  // Keep direct account links in this pop-out, including target="_blank" links.
  document.addEventListener('click', event => {
    if (!popout || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link) return;
    let url;
    try { url = new URL(notebookURL(link.href)); } catch { return; }
    const current = new URL(location.href);
    const nextAccount = url.searchParams.get('authuser') ?? url.pathname.match(/^\/u\/(\d+)\//)?.[1] ?? '0';
    const oldAccount = current.searchParams.get('authuser') ?? current.pathname.match(/^\/u\/(\d+)\//)?.[1] ?? '0';
    if (nextAccount === oldAccount) return;
    event.preventDefault(); event.stopImmediatePropagation();
    location.assign(url.href);
  }, true);
  context().catch(() => {});
  // Detect SPA notebook navigation without patching Google's page-world history.
  setInterval(update, 1000);
})();
