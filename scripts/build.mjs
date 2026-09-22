import { mkdir, readFile, copyFile, writeFile, rm } from 'node:fs/promises';
const target = process.argv[2] || 'firefox';
if (!['firefox', 'chrome'].includes(target)) throw new Error('Use firefox or chrome');
const dest = new URL(`../dist/${target}/`, import.meta.url);
await rm(dest, { recursive: true, force: true });
await mkdir(new URL('icons/', dest), { recursive: true });
const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', root)));
if (target === 'firefox') {
  delete manifest.minimum_chrome_version;
  manifest.permissions = manifest.permissions.filter(p => p !== 'sidePanel');
  delete manifest.side_panel;
  manifest.sidebar_action = { default_panel: 'sidepanel.html', default_title: manifest.name, default_icon: manifest.icons };
  manifest.background = { scripts: ['shared.js', 'background.js'] };
  manifest.browser_specific_settings = { gecko: { id: 'notebook-floating-chat@companion.local', strict_min_version: '140.0', data_collection_permissions: { required: ['none'] } } };
}
await writeFile(new URL('manifest.json', dest), JSON.stringify(manifest, null, 2)+'\n');
for (const file of ['background.js','shared.js','popup.html','popup.js','sidepanel.html','sidepanel.js','content.js','popout-controls.js','launcher.js','compact.css','ui.css','popup.css','LICENSE']) await copyFile(new URL(file, root), new URL(file, dest));
for (const size of [16,32,48,128]) await copyFile(new URL(`icons/icon-${size}.png`, root), new URL(`icons/icon-${size}.png`, dest));
console.log(`Built dist/${target}`);
