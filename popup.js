const { api, defaults, notebookURL } = Companion;
const $ = id => document.getElementById(id);
let currentWindowId;
const status = text => { $('status').textContent = text; };
const run = task => Promise.resolve().then(task).catch(error => status(error.message));
async function request(message) {
  const result = await api.runtime.sendMessage(message);
  if (!result?.ok) throw new Error(result?.error || 'Could not reach the extension.');
}
$('sidebar').disabled = true;
run(async () => {
  const [settings, win] = await Promise.all([api.storage.local.get(defaults), api.windows.getCurrent()]);
  currentWindowId = win.id;
  $('notebook-url').value = settings.notebookUrl;
  $('compact').checked = settings.compact;
  $('theme').value = settings.theme;
  document.documentElement.dataset.theme = settings.theme;
  $('sidebar').disabled = false;
});
$('notebook-form').addEventListener('submit', event => { event.preventDefault(); run(async () => {
  const url = notebookURL($('notebook-url').value.trim());
  await api.storage.local.set({ notebookUrl: url });
  $('notebook-url').value = url; status('Notebook saved.');
}); });
$('use-tab').addEventListener('click', () => run(async () => {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  const url = notebookURL(tab?.url || '');
  await api.storage.local.set({ notebookUrl: url }); $('notebook-url').value = url; status('Notebook saved.');
}));
$('sidebar').addEventListener('click', () => {
  // Call synchronously within the click: Chrome/Firefox require user activation.
  const operation = api.sidebarAction ? api.sidebarAction.open() : api.sidePanel.open({ windowId: currentWindowId });
  operation.then(() => window.close()).catch(error => status(error.message));
});
$('popout').addEventListener('click', () => run(async () => { await request({ type: 'popout' }); window.close(); }));
$('compact').addEventListener('change', () => run(() => api.storage.local.set({ compact: $('compact').checked })));
$('theme').addEventListener('change', () => run(async () => {
  document.documentElement.dataset.theme = $('theme').value;
  await api.storage.local.set({ theme: $('theme').value });
}));

$('floating').addEventListener('click', () => run(async () => {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  try {
    await api.scripting.executeScript({ target: { tabId: tab.id }, files: ['launcher.js'] });
    window.close();
  } catch {
    status('Open a regular webpage first. Browser pages and PDF viewers cannot show the button.');
  }
}));
run(async () => {
  const [commands, platform] = await Promise.all([api.commands.getAll(), api.runtime.getPlatformInfo()]);
  const label = name => {
    let key = commands.find(command => command.name === name)?.shortcut;
    if (!key) return 'Unassigned';
    if (platform.os === 'mac') key = key.replace(/MacCtrl|Ctrl/g, '⌃').replace(/Command/g, '⌘').replace(/Alt/g, '⌥').replace(/Shift/g, '⇧').replace(/\+/g, '');
    return key;
  };
  $('sidebar-key').textContent = label('toggle-sidebar');
  $('popout-key').textContent = label('toggle-popout');
});
