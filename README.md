# ChatGPT Goals

A privacy-first Microsoft Edge extension that keeps ChatGPT working toward a persistent goal through alternating **work** and **verification** turns.

![Edge](https://img.shields.io/badge/Microsoft_Edge-Manifest_V3-0A84FF?logo=microsoftedge)
![Version](https://img.shields.io/badge/version-1.2.0-10a37f)
![Privacy](https://img.shields.io/badge/data-local_only-22C55E)
![License](https://img.shields.io/badge/license-MIT-blue)

## What changed in v1.2

The extension no longer trusts a simple completion marker. Every work response is followed by a strict verification request that reintroduces the complete original goal, definition of done, milestones, required confidence, and latest work evidence.

A goal is accepted as complete only when the structured verdict says:

- `complete` is `true`;
- confidence meets the configured threshold;
- `remainingCriteria` is empty; and
- at least one concrete evidence item is present.

## How the loop works

1. **Work:** ChatGPT receives the full goal and performs the next concrete action.
2. **Verify:** The extension sends the full original goal plus the latest work response to a strict evaluator prompt.
3. **Decide:** The extension parses a structured `<GOAL_VERDICT>` JSON result.
4. **Continue:** When incomplete, the next work prompt includes the full goal, remaining criteria, confidence, and verifier-selected next action.
5. **Complete:** The run stops only after the verdict passes all completion gates.

The cycle repeats until completion, manual stop, an unrecoverable UI error, or the maximum number of work turns.

## Features

- Persistent local goals
- Autonomous multi-turn execution
- Full-goal reinjection on every work and verification turn
- Evidence-based structured completion verdicts
- Configurable 50–100% verification threshold
- Configurable 1–100 maximum work turns
- Visible **working** and **verifying** states
- Manual Stop control
- Run recovery after page refresh
- No backend, analytics, telemetry, account, or external API
- Manifest V3 with no build step

## Install in Microsoft Edge

1. Download this repository with **Code → Download ZIP**, or clone it:

   ```bash
   git clone https://github.com/benclawbot/ChatGPT-goal-extension.git
   ```

2. Open `edge://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Select the folder containing `manifest.json`.
6. Open or refresh `https://chatgpt.com`.
7. Select the floating **Goals** button.

After updating, select **Reload** on the extension card and refresh ChatGPT.

## Create a verifiable goal

Write the definition of done as measurable criteria and name the evidence expected. For example:

```text
Review the extension, fix blocking defects, run all available tests, update the
README, and provide the exact test result. Completion requires passing tests,
updated source and documentation, and no unresolved blocker.
```

Set a verification threshold—85% is the default—and select **Run until verified**.

## Structured verdict

The verifier must return:

```json
{
  "complete": false,
  "confidence": 0.72,
  "satisfiedCriteria": ["Source updated"],
  "remainingCriteria": ["Run tests"],
  "evidence": ["content.js contains the new runner"],
  "nextAction": "Run the test suite and fix any failures"
}
```

The JSON is wrapped in `<GOAL_VERDICT>` tags for reliable extraction.

## Safety and limitations

The extension coordinates messages in the current ChatGPT tab. It does not bypass safety policies, confirmations, tool permissions, authentication, or usage limits. The verifier is still the model in the same conversation, so this is stronger self-verification—not an independent external oracle. Concrete definitions of done and evidence requirements materially improve reliability.

ChatGPT’s DOM changes over time. Defensive selectors are included, but future interface changes may require maintenance.

## Privacy

Goals, thresholds, and active-run state are stored in `chrome.storage.local`. The extension makes no external network calls of its own. Goal content enters ChatGPT only when you start a run.

## Development

Requires Node.js 18 or newer:

```bash
npm test
```

## Structure

```text
├── manifest.json
├── src/
│   ├── content.js      Work/verify runner and ChatGPT integration
│   ├── content.css     Injected Goals panel styles
│   ├── store.js        Goal state, prompts, verdict parsing, completion gates
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
