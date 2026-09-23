# Privacy Policy for Gemini Notebook Companion

Effective date: September 23, 2026

Gemini Notebook Companion is an independent browser extension that provides sidebar, floating-window, and page-launcher access to NotebookLM. It is not affiliated with, endorsed by, or operated by Google.

## Data the extension stores

The extension stores the following information locally in the browser:

- The NotebookLM URL saved by the user.
- The selected light, dark, or system theme.
- The Chat only preference.
- Whether optional Chrome sidebar embedding is enabled.
- Temporary identifiers used to reuse the companion window and complete supported Google account-switch navigation.

These settings remain on the user's device. Temporary session identifiers are cleared by the browser when the extension session ends.

## Data collection and sharing

The extension does not collect, transmit, sell, rent, or share personal information with the developer or third parties. It does not use analytics, advertising, tracking pixels, telemetry, or a developer-operated backend.

The extension does not collect browsing history. It acts on the current tab only after the user selects a related action, such as using the current NotebookLM tab or adding the optional floating launcher.

## NotebookLM and Google services

NotebookLM is a Google service. When the extension opens or displays NotebookLM, the browser communicates directly with Google under the user's Google account. Google's processing of account information, notebook content, prompts, and responses is governed by Google's own terms and privacy policies. The developer of Gemini Notebook Companion does not receive any of this information.

## Browser permissions

The extension uses browser permissions only to provide its stated features:

- `sidePanel` or `sidebar_action` opens NotebookLM beside the active tab.
- `storage` saves the local settings described above.
- `activeTab` lets the user select the current NotebookLM tab.
- `scripting` adds the optional draggable launcher after the user requests it.
- `webNavigation` supports account-switch navigation in the managed floating window.
- NotebookLM host access enables companion features only on `notebook.google.com` and `notebooklm.google.com`.
- On Chrome, `declarativeNetRequestWithHostAccess` supports optional iframe embedding for extension-initiated NotebookLM frames.

## Remote code

All executable JavaScript, HTML, and CSS used by the extension is packaged with the extension. It does not download or execute remote code.

## Data removal

Users can remove stored extension data by uninstalling the extension or clearing its storage through the browser's extension settings.

## Changes to this policy

Material changes to this policy will be documented in the repository and published with the relevant extension update.

## Contact

Questions about this policy, bug reports, and extension support requests can be submitted through [GitHub Issues](https://github.com/anishcreations/gemini-notebook-companion/issues).
