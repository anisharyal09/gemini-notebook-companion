/* Same compact header in top-level pop-outs and Firefox's native sidebar. */
(() => {
  const { api, notebookURL } = Companion;
  let host, toggle, link, root, subtitle;
  Companion.renderPopoutControls = (enabled, compact, theme, mode = 'Floating') => {
    if (!enabled) {
      host?.remove(); host = null;
      document.documentElement.classList.remove('margin-popout');
      return;
    }
    if (!host) {
      host = document.createElement('div');
      host.style.cssText = 'all:initial;position:fixed;inset:0 0 auto;height:52px;z-index:2147483647;';
      const shadow = host.attachShadow({ mode: 'closed' });
      const style = document.createElement('style');
      style.textContent = `
        .bar{--bg:#f6f7f4;--ink:#213c35;--line:#dfe6e1;--muted:#708079;box-sizing:border-box;height:52px;display:flex;align-items:center;gap:10px;padding:0 14px;background:var(--bg);color:var(--ink);border-bottom:1px solid var(--line);font:12px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;color-scheme:light}
        .bar[data-theme=dark]{--bg:#14211e;--ink:#e6eee8;--line:#30423a;--muted:#a2b1a8;color-scheme:dark}
        @media(prefers-color-scheme:dark){.bar[data-theme=system]{--bg:#14211e;--ink:#e6eee8;--line:#30423a;--muted:#a2b1a8;color-scheme:dark}}
        .identity{margin-right:auto;min-width:0;display:flex;flex-direction:column;gap:1px}strong{font-size:14px;letter-spacing:-.4px;font-weight:600}.mode{font-size:8px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted)}label{display:flex;align-items:center;gap:6px;white-space:nowrap;font-size:11px;border:1px solid var(--line);padding:6px 8px;border-radius:7px}input{accent-color:#548267;margin:0;width:13px;height:13px}a{color:inherit;text-decoration:none;width:30px;height:30px;display:grid;place-items:center;border:1px solid var(--line);border-radius:7px;font-size:19px}a:hover{background:var(--line)}:focus-visible{outline:2px solid #79a28b;outline-offset:3px}
      `;
      root = document.createElement('div'); root.className = 'bar'; root.setAttribute('role','toolbar'); root.setAttribute('aria-label','Notebook Companion controls');
      const identity = document.createElement('div'); identity.className = 'identity';
      const title = document.createElement('strong'); title.textContent = 'Notebook';
      subtitle = document.createElement('span'); subtitle.className = 'mode'; identity.append(title, subtitle);
      const label = document.createElement('label'); toggle = document.createElement('input'); toggle.type = 'checkbox';
      label.append(toggle, document.createTextNode('Chat only'));
      toggle.addEventListener('change', () => api.storage.local.set({ compact: toggle.checked }).catch(() => { toggle.checked = !toggle.checked; }));
      link = document.createElement('a'); link.textContent = '↗'; link.title = 'Open notebook in a browser tab'; link.setAttribute('aria-label',link.title); link.target = '_blank'; link.rel = 'noopener noreferrer';
      root.append(identity, label, link); shadow.append(style, root); document.documentElement.append(host);
    }
    toggle.checked = compact; subtitle.textContent = mode;
    root.dataset.theme = ['dark','light'].includes(theme) ? theme : 'system';
    try { link.href = notebookURL(location.href); link.hidden = false; } catch { link.hidden = true; }
    document.documentElement.classList.add('margin-popout');
  };
})();
