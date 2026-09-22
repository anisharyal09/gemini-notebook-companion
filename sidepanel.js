const { api, defaults, notebookURL } = Companion;
const $ = id => document.getElementById(id);
let settings, timer, port, loadVersion = 0;
const status = text => { $('status').textContent = text; };
const run = task => Promise.resolve().then(task).catch(error => status(error.message));
async function request(message) {
  const result = await api.runtime.sendMessage(message);
  if (!result?.ok) throw new Error(result?.error || 'Extension unavailable. Try reopening the panel.');
  return result;
}
function connect(windowId) {
  port = api.runtime.connect({ name: 'notebook-panel' });
  port.postMessage({ windowId });
  port.onDisconnect.addListener(() => setTimeout(() => connect(windowId), 500));
}
async function load() {
  const version = ++loadVersion;
  clearTimeout(timer);
  $('welcome').hidden = settings.embed;
  $('frame-container').hidden = !settings.embed;
  $('disable').hidden = !settings.embed;
  if (!settings.embed) { $('notebook').removeAttribute('src'); status('Embedded chat is off.'); return; }
  await request({ type: 'prepare-embed' });
  if (version !== loadVersion || !settings.embed) return;
  $('notebook').src = notebookURL(settings.notebookUrl);
  $('fallback').hidden = true;
  status('Loading…');
  timer = setTimeout(() => {
    status('Chat blocked or taking too long. Try a pop-out.');
    $('fallback').hidden = false;
  }, 12000);
}
window.addEventListener('message', event => {
  if (!Companion.ORIGINS.includes(event.origin) || event.source !== $('notebook').contentWindow) return;
  if (event.data?.type !== 'notebook-companion-ready') return;
  clearTimeout(timer);
  $('fallback').hidden = true;
  status('');
  run(async () => {
    const url = notebookURL(event.data.url);
    if (url.includes('/notebook/')) await api.storage.local.set({ notebookUrl: url });
  });
});
run(async () => {
  settings = await api.storage.local.get(defaults);
  $('compact').checked = settings.compact;
  document.documentElement.dataset.theme = settings.theme;
  connect((await api.windows.getCurrent()).id);
  await load();
});
$('enable').addEventListener('click', () => run(() => request({ type: 'embed', enabled: true })));
$('disable').addEventListener('click', () => run(() => request({ type: 'embed', enabled: false })));
$('popout').addEventListener('click', () => run(() => request({ type: 'popout' })));
$('fallback').addEventListener('click', () => run(() => request({ type: 'popout' })));
$('signin').addEventListener('click', () => run(() => api.tabs.create({ url: settings?.notebookUrl || Companion.HOME })));
$('reload').addEventListener('click', () => run(async () => { settings = await api.storage.local.get(defaults); await load(); }));
$('compact').addEventListener('change', () => run(() => api.storage.local.set({ compact: $('compact').checked })));
api.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !settings) return;
  for (const [key, change] of Object.entries(changes)) settings[key] = change.newValue ?? defaults[key];
  $('compact').checked = settings.compact;
  document.documentElement.dataset.theme = settings.theme;
  if (changes.embed) run(load);
  // Do not reload a live conversation on URL updates from another view.
  else if (changes.notebookUrl) status('Notebook link saved. Use “Load saved notebook” to switch this view.');
});
