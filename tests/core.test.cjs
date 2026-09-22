const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function setup(configure = () => {}) {
  const listeners = {}, local = {}, session = {}, calls = [];
  const event = name => ({ addListener: fn => { listeners[name] = fn; } });
  const storage = values => ({ get: async keys => typeof keys === 'string' ? { [keys]: values[keys] } : { ...keys, ...values }, set: async data => Object.assign(values, data), remove: async key => delete values[key] });
  const api = {
    runtime: { id: 'test-extension', getURL: path => `chrome-extension://test-extension/${path.replace(/^\//,'')}`, onInstalled: event('installed'), onStartup: event('startup'), onConnect: event('connect'), onMessage: event('message') },
    storage: { local: storage(local), session: storage(session), onChanged: event('storage') },
    declarativeNetRequest: { updateDynamicRules: async rule => calls.push(['rules', rule]) },
    webNavigation: { onCreatedNavigationTarget: event('navigationTarget') },
    commands: { onCommand: event('command') },
    sidePanel: { open: async options => calls.push(['open',options]), close: async options => calls.push(['close',options]) },
    windows: { create: async options => { calls.push(['create',options]); return { id: 7, tabs: [{ id: 9 }] }; }, get: async id => ({ id, type:'popup', tabs:[{url:'https://notebooklm.google.com/notebook/test'}] }), update: async (...args) => calls.push(['focus',...args]), remove: async id => calls.push(['remove',id]), onRemoved:event('removed') },
    tabs: { sendMessage: async () => {}, onCreated: event('tabCreated'), onUpdated: event('tabUpdated'), onRemoved: event('tabRemoved') }
  };
  configure(api);
  const context = vm.createContext({ chrome:api, URL, console, setTimeout });
  vm.runInContext(fs.readFileSync('shared.js','utf8'),context);
  vm.runInContext(fs.readFileSync('background.js','utf8'),context);
  return { context, local, session, listeners, calls };
}
test('URL allowlist rejects foreign origins, credentials, scripts and unrelated paths', () => {
  const { context } = setup(); const normalize=context.Companion.notebookURL;
  for (const url of ['javascript:alert(1)','https://notebooklm.google.com.evil.test/notebook/x','https://user@notebooklm.google.com/','http://notebooklm.google.com/','https://notebooklm.google.com/settings','https://notebooklm.google.com:8443/']) assert.throws(() => normalize(url));
  assert.equal(normalize('https://notebooklm.google.com/u/1/notebook/abc-123?tracking=1#x'), 'https://notebooklm.google.com/u/1/notebook/abc-123');
});
test('embedding rule is extension-initiated NotebookLM subframes only; disabling removes it',async () => {
  const { context,calls }=setup(); await vm.runInContext('configureEmbedding(true)',context);
  const rule=calls[0][1].addRules[0];
  assert.equal(rule.condition.initiatorDomains[0],'test-extension');
  assert.equal(rule.condition.requestDomains[0],'notebooklm.google.com');
  assert.deepEqual(Array.from(rule.condition.resourceTypes),['sub_frame']);
  await vm.runInContext('configureEmbedding(false)',context);
  assert.equal(calls[1][1].addRules.length,0);
});
test('concurrent pop-out requests create one window and focus the same session', async () => {
  const { context,calls,session }=setup();
  await vm.runInContext('Promise.all([queuePopout(false),queuePopout(false)])',context);
  assert.equal(calls.filter(c=>c[0]==='create').length,1);
  assert.equal(calls.filter(c=>c[0]==='focus').length,1);
  assert.equal(session.popoutWindowId,7);
  await vm.runInContext('queuePopout(true)',context);
  assert.equal(calls.at(-1)[0],'remove');
});
test('stale window IDs recover by creating a pop-out',async () => {
  const {context,session,calls}=setup();session.popoutWindowId=99;
  context.chrome.windows.get=async()=>{throw Error('gone');};
  await vm.runInContext('queuePopout(false)',context);
  assert.equal(calls.at(-1)[0],'create');
});
test('sidebar shortcut uses window scope and follows panel connection lifetime', async () => {
  const {context,listeners,calls}=setup();
  await vm.runInContext('toggleSidebar({windowId:3})',context);
  let message,disconnect;
  listeners.connect({name:'notebook-panel',onMessage:{addListener:fn=>message=fn},onDisconnect:{addListener:fn=>disconnect=fn}});
  message({windowId:3});
  await vm.runInContext('toggleSidebar({windowId:3})',context);
  disconnect(); await vm.runInContext('toggleSidebar({windowId:3})',context);
  assert.deepEqual(calls.map(c=>c[0]),['open','close','open']);
  assert.equal(calls[1][1].windowId,3);
});
test('content scripts cannot turn on header removal or open windows', async () => {
  const {listeners,calls}=setup();
  const result = await new Promise(resolve=>listeners.message({type:'embed',enabled:true},{id:'test-extension',url:'https://notebooklm.google.com/notebook/x'},resolve));
  assert.equal(result.ok,false);assert.equal(calls.length,0);
});
test('normal tabs receive no companion context when no pop-out exists', async () => {
  const {listeners}=setup();
  const result=await new Promise(resolve=>listeners.message({type:'context'},{id:'test-extension',url:'https://notebooklm.google.com/',tab:{windowId:2}},resolve));
  assert.equal(result.popout,false);
});
test('new Notebook domain and Google account selector survive URL saving', () => {
  const { context } = setup();
  assert.equal(context.Companion.notebookURL('https://notebook.google.com/notebook/example?authuser=2&tracking=x#foo'), 'https://notebook.google.com/notebook/example?authuser=2');
  assert.throws(() => context.Companion.notebookURL('https://notebook.google.com.evil.test/notebook/example'));
});
test('both domains have scoped embedding rules and matching manifest access', async () => {
  const {context,calls}=setup(); await vm.runInContext('configureEmbedding(true)',context);
  const rules=calls[0][1].addRules;
  assert.equal(rules.length,2);
  assert.equal(rules[1].condition.requestDomains[0],'notebook.google.com');
  assert.equal(rules[1].condition.initiatorDomains[0],'test-extension');
  const manifest=JSON.parse(fs.readFileSync('manifest.json'));
  for(const origin of context.Companion.ORIGINS) {
    assert.ok(manifest.host_permissions.includes(`${origin}/*`));
    assert.ok(manifest.content_scripts[0].matches.includes(`${origin}/*`));
    assert.ok(manifest.content_security_policy.extension_pages.includes(origin));
  }
});
test('pop-out is reused after redirect to the new Notebook domain',async () => {
  const {context,session,calls}=setup();session.popoutWindowId=7;
  context.chrome.windows.get=async()=>({id:7,type:'popup',tabs:[{url:'https://notebook.google.com/notebook/example?authuser=2'}]});
  await vm.runInContext('queuePopout(false)',context);
  assert.equal(calls[0][0],'focus');
});
test('Firefox uses a native remote sidebar and removes obsolete embedding rules',async () => {
  const {context,calls,local}=setup(api=>{api.sidebarAction={setPanel:async options=>calls.push(['panel',options])};});
  local.notebookUrl='https://notebook.google.com/notebook/test?authuser=2';
  await vm.runInContext('initialize()',context);
  assert.equal(calls[0][1].addRules.length,0);
  assert.equal(calls[1][1].panel,local.notebookUrl);
});
test('account selector return replaces the original pop-out and closes only the spawned tab',async()=>{
  const {context,session,calls,local}=setup(); session.popoutWindowId=7;
  context.chrome.tabs.get=async()=>({id:9,windowId:7,url:'https://notebook.google.com/?authuser=0'});
  context.chrome.tabs.update=async(id,options)=>calls.push(['navigate',id,options]);
  context.chrome.tabs.remove=async id=>calls.push(['removeTab',id]);
  await vm.runInContext("followAccountTab({id:10,openerTabId:9,url:'https://notebook.google.com/?authuser=2'})",context);
  assert.equal(calls[0][0],'navigate');assert.equal(calls[0][1],9);
  assert.equal(calls.at(-1)[1],10);
  assert.equal(local.notebookUrl,'https://notebook.google.com/?authuser=2');
});
test('normal links, same-account links, and unrelated openers are never captured',async()=>{
  const {context,session,calls}=setup(); session.popoutWindowId=7;
  context.chrome.tabs.get=async()=>({id:9,windowId:7,url:'https://notebook.google.com/?authuser=0'});
  await vm.runInContext("followAccountTab({id:10,openerTabId:9,url:'https://example.com/'})",context);
  await vm.runInContext("followAccountTab({id:10,openerTabId:9,url:'https://notebook.google.com/notebook/test?authuser=0'})",context);
  context.chrome.tabs.get=async()=>({id:9,windowId:88,url:'https://notebook.google.com/'});
  await vm.runInContext("followAccountTab({id:10,openerTabId:9,url:'https://notebook.google.com/?authuser=2'})",context);
  assert.equal(calls.length,0);
});

test('noopener account returns use the recorded navigation source after worker restart',async()=>{
  const {context,session,calls}=setup();
  session.popoutWindowId=7;session['account-target-10']=9;
  context.chrome.tabs.get=async()=>({id:9,windowId:7,url:'https://notebook.google.com/'});
  context.chrome.tabs.update=async(id,options)=>calls.push(['navigate',id,options]);
  context.chrome.tabs.remove=async id=>calls.push(['removeTab',id]);
  await vm.runInContext("followAccountTab({id:10,url:'https://notebook.google.com/?authuser=2'})",context);
  assert.equal(calls[0][1],9);assert.equal(calls.at(-1)[1],10);
});
