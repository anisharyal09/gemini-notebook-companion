if (typeof importScripts === 'function') importScripts('shared.js');
const { api, defaults, notebookURL } = Companion;
const panels = new Map();
let popoutOperation = Promise.resolve();
const extensionOrigin = new URL(api.runtime.getURL('/')).host;

async function configureEmbedding(enabled) {
  // Firefox hosts remote documents natively; no iframe/header workaround is needed.
  if (api.sidebarAction) {
    await api.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [1, 2], addRules: [] });
    return;
  }
  const rules = Companion.ORIGINS.map((origin, index) => ({
    id: index + 1, priority: 1,
    action: { type: 'modifyHeaders', responseHeaders: [
      { header: 'x-frame-options', operation: 'remove' },
      { header: 'content-security-policy', operation: 'remove' }
    ] },
    condition: { requestDomains: [new URL(origin).hostname], initiatorDomains: [extensionOrigin],
      resourceTypes: ['sub_frame'], urlFilter: `|${origin}/` }
  }));
  await api.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [1, 2], addRules: enabled ? rules : [] });
}
async function initialize() {
  const settings = await api.storage.local.get(defaults);
  await configureEmbedding(settings.embed);
  if (api.sidebarAction) await api.sidebarAction.setPanel({ panel: notebookURL(settings.notebookUrl) });
}
api.runtime.onInstalled.addListener(() => initialize().catch(console.error));
api.runtime.onStartup.addListener(() => initialize().catch(console.error));
api.storage.onChanged.addListener((changes, area) => {
  if (api.sidebarAction && area === 'local' && changes.notebookUrl?.newValue !== undefined && changes.notebookUrl.newValue !== changes.notebookUrl.oldValue) {
    api.sidebarAction.setPanel({ panel: notebookURL(changes.notebookUrl.newValue) }).catch(console.error);
  }
});

api.runtime.onConnect.addListener(port => {
  if (port.name !== 'notebook-panel') return;
  let windowId;
  port.onMessage.addListener(message => {
    if (Number.isInteger(message.windowId)) { windowId = message.windowId; panels.set(windowId, port); }
  });
  port.onDisconnect.addListener(() => { if (panels.get(windowId) === port) panels.delete(windowId); });
});
function toggleSidebar(tab) {
  if (api.sidebarAction) return api.sidebarAction.toggle();
  if (!Number.isInteger(tab?.windowId)) throw new Error('Select a browser tab and try again.');
  return panels.has(tab.windowId)
    ? api.sidePanel.close({ windowId: tab.windowId })
    : api.sidePanel.open({ windowId: tab.windowId });
}
async function popout(toggle = false) {
  const settings = await api.storage.local.get(defaults);
  const { popoutWindowId, popoutTabId } = await api.storage.session.get({ popoutWindowId: null, popoutTabId: null });
  if (Number.isInteger(popoutWindowId)) {
    const existing = await api.windows.get(popoutWindowId, { populate: true }).catch(() => null);
    if (existing?.type === 'popup' && existing.tabs?.some(t => t.id === popoutTabId || Companion.isNotebook(t.url))) {
      if (toggle) await api.windows.remove(popoutWindowId);
      else await api.windows.update(popoutWindowId, { focused: true });
      return;
    }
  }
  const win = await api.windows.create({ url: notebookURL(settings.notebookUrl), type: 'popup', width: 420, height: 700, focused: true });
  await api.storage.session.set({ popoutWindowId: win.id, popoutTabId: win.tabs?.[0]?.id ?? null });
  // The page may have loaded before the window ID was saved.
  for (const tab of win.tabs || []) api.tabs.sendMessage(tab.id, { type: 'refresh-context' }).catch(() => {});
}
function queuePopout(toggle) {
  const result = popoutOperation.then(() => popout(toggle));
  popoutOperation = result.catch(() => {});
  return result;
}
api.windows.onRemoved.addListener(async id => {
  const state = await api.storage.session.get('popoutWindowId');
  if (state.popoutWindowId === id) await api.storage.session.remove('popoutWindowId');
});
api.commands.onCommand.addListener((command, tab) => {
  try {
    const operation = command === 'toggle-sidebar' ? toggleSidebar(tab) : queuePopout(true);
    Promise.resolve(operation).catch(console.error);
  } catch (error) { console.error(error); }
});
api.runtime.onMessage.addListener((message, sender, reply) => {
  const fromUI = sender.id === api.runtime.id && sender.url?.startsWith(api.runtime.getURL(''));
  const fromNotebook = sender.id === api.runtime.id && Companion.isNotebook(sender.url);
  const fromLauncher = sender.id === api.runtime.id && sender.frameId === 0 && Number.isInteger(sender.tab?.id);
  if (!fromUI && !fromNotebook && !fromLauncher) return false;
  (async () => {
    if (message.type === 'context' && fromNotebook) {
      const { popoutWindowId } = await api.storage.session.get('popoutWindowId');
      return { popout: Number.isInteger(popoutWindowId) && sender.tab?.windowId === popoutWindowId, sidebar: !!api.sidebarAction && !sender.tab }; 
    }
    if (message.type === 'popout' && fromLauncher) { await queuePopout(false); return {}; }
    if (!fromUI) throw new Error('Unsupported request.');
    if (message.type === 'popout') { await queuePopout(false); return {}; }
    if (message.type === 'prepare-embed') {
      const settings = await api.storage.local.get(defaults);
      await configureEmbedding(settings.embed);
      return {};
    }
    if (message.type === 'embed') {
      await configureEmbedding(message.enabled === true);
      await api.storage.local.set({ embed: message.enabled === true });
      return {};
    }
    throw new Error('Unknown request.');
  })().then(value => reply({ ok: true, ...value }), error => reply({ ok: false, error: error.message }));
  return true;
});

// Follow only new tabs opened by the managed pop-out, and only when they return
// to Notebook with a different explicit account. Unrelated links remain tabs.
function accountOf(value) {
  try { const url = new URL(notebookURL(value)); return url.searchParams.get('authuser') ?? url.pathname.match(/^\/u\/(\d+)\//)?.[1] ?? '0'; }
  catch { return null; }
}
const accountTransfers = new Set();
async function followAccountTab(tab) {
  if (accountTransfers.has(tab.id)) return;
  accountTransfers.add(tab.id);
  try {
  const tracked = await api.storage.session.get(`account-target-${tab.id}`);
  tab = { ...tab, openerTabId: tab.openerTabId ?? tracked[`account-target-${tab.id}`] };
  const state = await api.storage.session.get('popoutWindowId');
  if (!Number.isInteger(tab.openerTabId) || !Number.isInteger(state.popoutWindowId)) return;
  const opener = await api.tabs.get(tab.openerTabId).catch(() => null);
  if (!opener || opener.windowId !== state.popoutWindowId || tab.id === opener.id) return;
  const destination = accountOf(tab.url), current = accountOf(opener.url);
  if (destination === null || current === null || destination === current) return;
  const url = notebookURL(tab.url);
  await api.tabs.update(opener.id, { url, active: true });
  await api.windows.update(opener.windowId, { focused: true });
  await api.storage.local.set({ notebookUrl: url });
  await api.tabs.remove(tab.id);
  } finally { accountTransfers.delete(tab.id); }
}
api.tabs.onCreated.addListener(tab => { followAccountTab(tab).catch(console.error); });
api.tabs.onUpdated.addListener((id, change, tab) => {
  if (change.url && Companion.isNotebook(change.url)) followAccountTab({ ...tab, url: change.url }).catch(console.error);
});

// Google account links can use noopener, so tabs.openerTabId alone is insufficient.
api.webNavigation.onCreatedNavigationTarget.addListener(details => {
  (async () => {
    const { popoutWindowId } = await api.storage.session.get('popoutWindowId');
    if (!Number.isInteger(popoutWindowId)) return;
    const source = await api.tabs.get(details.sourceTabId).catch(() => null);
    if (source?.windowId !== popoutWindowId || !Companion.isNotebook(source.url)) return;
    await api.storage.session.set({ [`account-target-${details.tabId}`]: details.sourceTabId });
    const target = await api.tabs.get(details.tabId).catch(() => null);
    if (target) await followAccountTab({ ...target, openerTabId: details.sourceTabId });
  })().catch(console.error);
});
api.tabs.onRemoved.addListener(id => {
  api.storage.session.remove(`account-target-${id}`).catch(console.error);
});
