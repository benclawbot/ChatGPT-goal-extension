# ChatGPT Goals

> A privacy-first Microsoft Edge extension that adds persistent goals, milestones, and progress tracking directly to the ChatGPT web interface.

![Microsoft Edge](https://img.shields.io/badge/Microsoft%20Edge-Manifest%20V3-0A84FF?logo=microsoftedge)
![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?logo=javascript&logoColor=111)
![Privacy](https://img.shields.io/badge/Data-local%20only-22C55E)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

ChatGPT Goals turns conversations into goal-oriented work. Define an objective once, track its progress across sessions, and insert structured goal context into any ChatGPT prompt without relying on a backend, external API, or account.

## Highlights

- **Persistent goals** — keep long-term objectives available across ChatGPT sessions.
- **Progress tracking** — update completion from 0–100% and mark goals active, paused, or complete.
- **Goal context injection** — use **Use in chat** to place a structured goal brief into the ChatGPT composer.
- **Native-feeling sidebar** — open the Goals panel from a floating control inside ChatGPT.
- **Private by default** — goals remain in `chrome.storage.local` on your device.
- **Zero build setup** — plain HTML, CSS, and JavaScript with Manifest V3.
- **Theme-aware** — supports ChatGPT light and dark appearances.
- **Chromium compatible** — designed for Microsoft Edge and compatible Chromium browsers.

## Installation

### Load the unpacked extension in Microsoft Edge

1. Download this repository using **Code → Download ZIP**, or clone it:

   ```bash
   git clone https://github.com/benclawbot/ChatGPT-goal-extension.git
   ```

2. Open `edge://extensions` in Microsoft Edge.
3. Turn on **Developer mode**.
4. Select **Load unpacked**.
5. Choose the repository folder containing `manifest.json`.
6. Open or refresh [ChatGPT](https://chatgpt.com).
7. Select the floating **Goals** button to open the sidebar.

> After updating the source, return to `edge://extensions` and select **Reload** on the extension card.

## Usage

### Create a goal

Open the Goals panel, add a title and description, choose its status, and set the current progress.

### Use a goal in ChatGPT

Select **Use in chat** on a goal. The extension inserts a structured context block into the current ChatGPT composer so the conversation can work toward that objective.

Example inserted context:

```text
Goal: Launch the project website
Status: Active
Progress: 40%
Context: Finish responsive QA, publish documentation, and deploy the production build.

Help me make progress toward this goal.
```

### Manage progress

Goals can be edited, paused, completed, or deleted. All changes are saved automatically in local extension storage.

## Privacy and permissions

The extension has no analytics, tracking, remote database, or external API calls.

It requests only:

| Permission | Purpose |
| --- | --- |
| `storage` | Save goals locally in the browser. |
| ChatGPT page access | Add the Goals interface and insert selected goal context into the composer. |

Your goal data is not sent anywhere by the extension. Text is shared with ChatGPT only when you explicitly select **Use in chat** and then submit the prompt yourself.

## Development

Requirements:

- Node.js 18 or newer for tests
- Microsoft Edge for manual extension testing

Run the automated tests:

```bash
npm test
```

No bundler or compilation step is required. Edit the files, reload the extension in `edge://extensions`, and refresh ChatGPT.

## Project structure

```text
ChatGPT-goal-extension/
├── icons/                 Extension icons
├── src/
│   ├── content.js         ChatGPT integration and goal interface
│   ├── content.css        Injected sidebar styles
│   ├── popup.html         Extension popup shell
│   ├── popup.css          Popup styles
│   └── store.js           Goal storage and normalization logic
├── tests/
│   └── store.test.js      Storage unit tests
├── manifest.json          Manifest V3 configuration
├── package.json           Test scripts and project metadata
└── LICENSE                MIT license
```

## Compatibility note

ChatGPT is a continuously evolving web application. The extension uses multiple composer selectors and defensive DOM handling, but future ChatGPT interface changes may require selector updates. Please open an issue with the Edge version, ChatGPT URL, and reproduction steps when reporting a compatibility problem.

## Roadmap

- Goal milestones and subtasks
- Optional reminders and review cadence
- Goal templates
- Import and export
- Per-project goal groups
- Conversation-to-progress suggestions
- Keyboard shortcuts

## Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Keep the extension dependency-free unless a dependency clearly improves maintainability.
4. Add or update tests for storage and goal-state changes.
5. Open a pull request explaining the user impact and validation performed.

## Disclaimer

This is an independent open-source project and is not affiliated with, endorsed by, or sponsored by OpenAI or Microsoft. ChatGPT is a trademark of OpenAI. Microsoft Edge is a trademark of Microsoft.

## License

Released under the [MIT License](LICENSE).
