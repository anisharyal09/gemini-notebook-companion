# Store listing copy

## Chrome Web Store

**Name**  
Gemini Notebook Companion

**Category**  
Productivity

**Short description**  
Keep NotebookLM beside your research with a compact sidebar, floating window, and optional page launcher.

**Detailed description**  
Gemini Notebook Companion keeps your NotebookLM conversation close to the material you are reading, watching, or studying.

Open a saved notebook in a browser sidebar, a reusable floating window, or from a small draggable launcher on an ordinary webpage. The companion remembers your notebook link and selected Google account locally, so you can move between tabs without rebuilding your setup.

Features:

- Sidebar for a notebook beside the current tab.
- Reusable, resizable floating window.
- Draggable page launcher for regular webpages.
- Chat only mode for a focused Notebook layout.
- Saved notebook links and supported Google account switching.
- Keyboard shortcuts for the sidebar and floating window.
- Light, dark, and system themes for companion controls.

No API key, backend, analytics, or runtime dependencies. Settings and saved notebook links stay on your device. Gemini Notebook Companion is an independent project and is not affiliated with Google.

**Single purpose**  
Provide compact sidebar and floating access to a user's own NotebookLM notebooks while they work in other browser tabs.

**Privacy**  
This extension does not collect, sell, or transmit personal data to its developer. It stores only extension settings and a saved NotebookLM URL in browser-local storage. NotebookLM itself remains a Google service and connects directly to Google under the user's account.

**Privacy policy URL**

https://github.com/anishcreations/gemini-notebook-companion/blob/main/PRIVACY.md

**Permission explanations**

| Permission | Why it is needed |
| --- | --- |
| `sidePanel` | Opens the companion in Chrome's native browser sidebar. |
| `storage` | Saves the notebook URL, theme, and compact-mode setting locally. |
| `activeTab` | Lets the popup use the current NotebookLM tab when the user asks. |
| `scripting` | Adds the optional floating launcher only after the user selects it. |
| `webNavigation` | Keeps supported Google account-switch navigation in the existing floating window. |
| `declarativeNetRequestWithHostAccess` | Enables Chrome's optional NotebookLM iframe mode by removing frame restrictions only for extension-initiated NotebookLM frames. |
| NotebookLM host access | Restricts notebook actions to `notebook.google.com` and `notebooklm.google.com`. |

**Screenshots and captions**

1. `docs/store-assets/01-extension-popup.png` — Choose Sidebar, Floating window, or a draggable page launcher from the compact extension popup.
2. `docs/store-assets/02-sidebar-floating-button.png` — Keep NotebookLM beside a video or webpage, with the optional floating launcher visible on the page.
3. `docs/store-assets/03-floating-window-pdf.png` — Use a reusable floating Notebook window while reading a PDF; the extension can also use the native browser sidebar.

## Firefox Add-ons

**Name**  
Gemini Notebook Companion

**Summary**  
Keep NotebookLM beside your research with a Firefox sidebar, reusable floating window, and optional page launcher.

**Categories**  
Productivity; Education

**Support website**

https://github.com/anishcreations/gemini-notebook-companion/issues

**Description**  
Use the same detailed description and screenshots listed for Chrome.

**Reviewer notes**  
The Firefox build uses Firefox's native `sidebar_action` to load NotebookLM directly in the sidebar. The extension does not use Chrome's iframe header workaround on Firefox.

To test:

1. Sign in to NotebookLM in a normal Firefox tab.
2. Open the extension popup and save a NotebookLM URL, or use the current NotebookLM tab.
3. Select Sidebar or Floating window.
4. Toggle Chat only from the extension controls to see the compact notebook layout.

**Source submission**  
Upload a ZIP of this repository's source files, excluding `node_modules/` and generated `dist/`. The reviewer can reproduce the Firefox package with:

```sh
npm install
npm run build
```

The submitted add-on package should be the contents of `dist/firefox` zipped with `manifest.json` at the archive root.
