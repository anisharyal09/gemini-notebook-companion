# Technical notes

## Chrome sidebar embedding and sign-in

The sidebar opens with an explicit **Load chat in sidebar** button. This experimental mode installs scoped header handling, restricted to:

- HTTPS requests to `notebooklm.google.com` or `notebook.google.com`;
- subframe document requests;
- requests initiated by this extension's origin.

Chrome removes `X-Frame-Options` and the response `Content-Security-Policy` header for those requests. Removing the full CSP also removes protections beyond `frame-ancestors`; declarative rules cannot surgically remove just that directive. Normal top-level NotebookLM tabs and pop-outs are not affected. **Disable embedding** unloads the iframe and removes the Chrome rules. It is off by default.

Embedding is **best effort**, not a supported Google integration. Third-party cookie policies, account restrictions, Google sign-in redirects, frame restrictions delivered outside response headers, or future site changes may still prevent it. The extension does not bypass authentication. A connected indicator means the NotebookLM document's content script responded, not that an authenticated conversation has been verified.

If the sidebar remains blank or needs sign-in, use the always-visible pop-out arrow. Sign in in a regular NotebookLM tab first, then reopen the view. The direct pop-out uses top-level navigation and is the preferred fallback.

## Persistence: what is saved

- The active notebook URL, compact setting, embedding choice, and companion theme are saved in `storage.local` on this device.
- Notebook navigation inside companion views updates the saved URL. Ordinary NotebookLM tabs are left alone until you choose **Use current NotebookLM tab**.
- The live pop-out window ID is stored in `storage.session`, so a suspended background worker can find it again. The managed tab ID also keeps the window reusable while it is on a Google sign-in page. Stale IDs recover automatically.
- Switching ordinary browser tabs does not navigate the global sidebar or pop-out. In Chrome, saving a different URL also does not interrupt an existing view; use **Load saved notebook**, or close and reopen the pop-out, to switch.
- NotebookLM controls authentication, chat history, and unsent input. Closing a view, restarting the browser, or switching modes can discard unsent text. This extension does not back up drafts or transfer live DOM state between views.

## Limits worth knowing

A standard `windows.create({type: 'popup'})` window is movable and resizable, but **not always-on-top**. It remains separate from tab switching and can still be covered by another window. OS window tiling/pinning can help. This project does not claim Document Picture-in-Picture support.

Compact styling uses conservative selectors for Notebook’s private DOM. Google can change them at any time. The native Firefox sidebar loaded a signed-in notebook during development; the latest spacing changes were checked against a layout fixture, not every live Notebook layout. Turn **Chat only** off if a control disappears or a layout looks wrong. Appearance changes style the extension shell; NotebookLM manages its own theme.

## Permissions and privacy

| Permission | Purpose |
| --- | --- |
| `sidePanel` (Chrome) | Native browser side panel |
| `storage` | Local preferences, notebook URL, and session window ID |
| `activeTab` | Read the current tab URL and authorize the requested floating button |
| `webNavigation` | Associate account-selector tabs (including `noopener` links) with their originating companion window |
| `scripting` | Insert the floating button only into the current page on request |
| `declarativeNetRequestWithHostAccess` | Narrow, opt-in iframe response-header rule |
| Both notebook host origins | Companion content script and matching header modification |

Broad `tabs` access and access to all websites are unnecessary and intentionally omitted. The floating launcher adds its own controls; it does not read or upload the page contents. No telemetry, API keys, credentials, chat text, or research documents are collected by the extension. NotebookLM itself communicates with Google under your account and Google's policies. Remove the extension to delete its local settings and dynamic rules.

## Development

```sh
npm test       # Node's built-in test runner; no dependency install needed
npm run build  # clean dist/chrome and dist/firefox packages
```

| File | Responsibility |
| --- | --- |
| `manifest.json` | Chrome MV3 permissions, UI entries, content script and shortcuts |
| `background.js` | Window lifecycle, shortcut handling, trusted messages, embedding rule |
| `shared.js` | Browser API adapter, defaults, strict NotebookLM URL validation |
| `popup.html`, `popup.js` | Notebook picker and launcher |
| `sidepanel.html`, `sidepanel.js` | Persistent wrapper, connection status and fallback |
| `content.js`, `compact.css` | Scoped, reversible compact styling and notebook navigation detection |
| `launcher.js` | Draggable, removable floating button in an isolated shadow root |
| `ui.css` | Responsive shell, keyboard focus styles, dark/light themes |
| `scripts/build.mjs` | Firefox manifest conversion and clean browser packages |
| `tests/core.test.cjs` | Mocked extension API regression tests |
| `icons/` | Generated source art and 16/32/48/128 px PNG assets |

Tests cover hostile URL rejection, embedding scope/removal, concurrent pop-out deduplication, stale window recovery, sidebar toggle state, and message authorization. They do not establish Google authentication, current NotebookLM selector compatibility, or real-browser iframe behavior.

### Manual release checklist

- Load each browser package and check the extension error console.
- Save a notebook by URL and with **Use current NotebookLM tab**; reject unrelated sites.
- Open/close the sidebar with the shortcut; switch browser tabs without a reload.
- Open the pop-out twice and verify reuse. Suspend the worker, then focus the same window again.
- Navigate between notebooks and confirm the saved link changes.
- Close the pop-out and reopen it; test both shortcuts and shortcut conflicts.
- Test embedded chat signed in and signed out, with third-party cookies blocked. Confirm fallback remains accessible.
- Disable embedding and inspect dynamic rules: rules 1 and 2 should be gone (Firefox uses a native remote sidebar instead).
- Test 300/375/450 px widths, keyboard focus, both themes, and Chat only on/off.
- Verify ordinary NotebookLM tabs retain their original layout.


## Browser APIs

- [Firefox remote panels](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/sidebarAction/setPanel)
- [Chrome sidePanel](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
- [Chrome declarativeNetRequest](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)

## Layout verification

The release UI was checked in isolated headless Chrome at 300, 380, and 450 px sidebar widths. A synthetic chat fixture verified that the floating header leaves the composer visible and that removing companion controls restores the page class. These checks do not replace testing against Google’s current signed-in page.
