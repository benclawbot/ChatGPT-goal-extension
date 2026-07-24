# ChatGPT Goals

A privacy-first Microsoft Edge extension that keeps ChatGPT working toward a persistent goal instead of stopping after the first response.

![Edge](https://img.shields.io/badge/Microsoft_Edge-Manifest_V3-0A84FF?logo=microsoftedge)
![Version](https://img.shields.io/badge/version-1.1.0-10a37f)
![License](https://img.shields.io/badge/license-MIT-blue)

## What it does

ChatGPT Goals adds a floating **Goals** panel to the ChatGPT web interface. Create a goal, define what completion means, and select **Run until done**.

The extension then:

1. Sends the goal and its definition of done to ChatGPT.
2. Waits for the current response to finish.
3. Detects whether ChatGPT returned the completion marker `[GOAL_COMPLETE]`.
4. Automatically sends a continuation message when more work is required.
5. Repeats until the goal is complete, you select **Stop**, or the configured turn limit is reached.

This fixes the original one-shot behavior where the extension only inserted context into the composer and stopped after the first ChatGPT reply.

## Features

- Persistent goals stored locally in Edge
- Autonomous multi-turn execution loop
- Configurable limit from 1 to 100 turns
- Explicit `[GOAL_COMPLETE]` completion protocol
- Visible running state and turn counter
- Manual Stop control
- Active-run recovery after page refresh
- Progress and status tracking
- Light and dark mode support
- No backend, analytics, account, or external API
- Manifest V3 and no build step

## Install in Microsoft Edge

1. Download the repository with **Code → Download ZIP**, or clone it:

   ```bash
   git clone https://github.com/benclawbot/ChatGPT-goal-extension.git
   ```

2. Open `edge://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Select the folder containing `manifest.json`.
6. Open or refresh `https://chatgpt.com`.
7. Select the floating **Goals** button.

After pulling an update, select **Reload** on the extension card in `edge://extensions` and refresh ChatGPT.

## Usage

### Create a useful goal

A strong goal contains a clear definition of done. For example:

**Goal**

```text
Prepare the repository for a public v1 release
```

**Definition of done / constraints**

```text
Review the code, fix blocking defects, run available tests, update the README,
and produce a final release checklist. Do not stop at planning; complete each
available step. The goal is complete only when all checks pass or remaining
blockers are explicitly documented.
```

Set the maximum autonomous turns, save the goal, then select **Run until done**.

### Completion behavior

The initial prompt instructs ChatGPT to finish with the exact marker:

```text
[GOAL_COMPLETE]
```

The extension stops automatically when that marker appears. It also stops when:

- you select **Stop**;
- the maximum turn count is reached;
- the goal is deleted or already marked complete;
- ChatGPT's composer or send button is unavailable.

## Important limitations

The extension coordinates messages in the current browser tab. It does **not** bypass ChatGPT safety policies, confirmations, tool permissions, usage limits, or authentication. Keep the ChatGPT tab open while the loop is running.

ChatGPT's web interface changes frequently. The extension uses several defensive selectors, but a future UI update may require selector maintenance.

## Privacy

The extension requests only local storage and access to ChatGPT pages.

| Permission | Reason |
| --- | --- |
| `storage` | Save goals and active-run state locally. |
| `chatgpt.com` / `chat.openai.com` | Add the Goals interface, monitor completed replies, and submit continuation messages. |

There is no analytics, remote database, telemetry, or external API call in the extension.

## Development

Requires Node.js 18 or later for tests.

```bash
npm test
```

No bundler is required. Edit the files, reload the extension in Edge, and refresh ChatGPT.

## Structure

```text
├── manifest.json
├── src/
│   ├── content.js      Autonomous runner and ChatGPT integration
│   ├── content.css     Injected Goals panel styles
│   ├── store.js        Goal and run-state persistence
│   ├── popup.html
│   └── popup.css
├── tests/
│   └── store.test.js
├── package.json
└── LICENSE
```

## Disclaimer

This independent open-source project is not affiliated with, endorsed by, or sponsored by OpenAI or Microsoft. ChatGPT is a trademark of OpenAI. Microsoft Edge is a trademark of Microsoft.

## License

MIT
