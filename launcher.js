(() => {
  const KEY = '__notebookFloatingLauncher';
  if (globalThis[KEY]) { globalThis[KEY](); return; }
  const api = globalThis.browser || globalThis.chrome;
  const host = document.createElement('div');
  host.style.cssText = 'all:initial;position:fixed;right:20px;bottom:24px;z-index:2147483647;';
  const shadow = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = ':host{color-scheme:light} .wrap{position:relative} button{border:0;cursor:pointer;font:600 14px system-ui} .open{width:52px;height:52px;border-radius:50%;color:#f7f8ec;background:#174b40;box-shadow:0 4px 18px #0004;touch-action:none;font-size:24px} .close{position:absolute;right:-5px;top:-8px;width:22px;height:22px;border-radius:50%;background:#f7f8ec;color:#174b40} button:focus-visible{outline:3px solid #70ad90;outline-offset:3px} .status{position:absolute;bottom:60px;right:0;min-width:160px;background:#174b40;color:white;border-radius:8px;padding:8px;font:12px system-ui} .status:empty{display:none}';
  const wrap = document.createElement('div'); wrap.className = 'wrap';
  const open = document.createElement('button'); open.className = 'open'; open.textContent = '▤';
  open.title = 'Open notebook · drag to move'; open.setAttribute('aria-label', 'Open notebook floating window');
  const close = document.createElement('button'); close.className = 'close'; close.textContent = '×'; close.setAttribute('aria-label', 'Remove floating button');
  const status = document.createElement('div'); status.className = 'status'; status.setAttribute('role', 'status');
  wrap.append(open, close, status); shadow.append(style, wrap); document.documentElement.append(host);
  function remove() { host.remove(); window.removeEventListener('resize', clamp); delete globalThis[KEY]; }
  globalThis[KEY] = remove;
  close.addEventListener('click', remove);
  let start, moved = false;
  function position(x, y) {
    host.style.right = 'auto'; host.style.bottom = 'auto';
    host.style.left = `${Math.max(8, Math.min(innerWidth - 64, x))}px`;
    host.style.top = `${Math.max(16, Math.min(innerHeight - 64, y))}px`;
  }
  function clamp() { const rect = host.getBoundingClientRect(); position(rect.x, rect.y); }
  window.addEventListener('resize', clamp);
  open.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const rect = host.getBoundingClientRect();
    start = { x: e.clientX, y: e.clientY, left: rect.left, top: rect.top }; moved = false;
    open.setPointerCapture(e.pointerId);
  });
  open.addEventListener('pointermove', e => {
    if (!start) return;
    const dx = e.clientX-start.x, dy = e.clientY-start.y;
    if (Math.hypot(dx,dy) > 5) moved = true;
    if (moved) position(start.left+dx, start.top+dy);
  });
  open.addEventListener('pointerup', () => { start = null; });
  open.addEventListener('pointercancel', () => { start = null; moved = false; });
  open.addEventListener('click', async e => {
    if (moved && e.detail !== 0) { moved = false; return; }
    try {
      const result = await api.runtime.sendMessage({ type: 'popout' });
      if (!result?.ok) throw Error(result?.error);
      status.textContent = '';
    } catch { status.textContent = 'Reload this page and add the button again.'; }
  });
})();
