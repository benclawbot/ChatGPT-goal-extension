(() => {
  'use strict';
  if (window.__chatgptGoalsLoaded) return;
  window.__chatgptGoalsLoaded = true;

  const store = window.ChatGPTGoalStore;
  let panel;
  let list;
  let runnerTimer = null;
  let runnerBusy = false;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  function el(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }

  function findComposer() {
    return document.querySelector('#prompt-textarea') || document.querySelector('textarea[data-id="root"]') ||
      document.querySelector('form textarea') || document.querySelector('[contenteditable="true"][data-virtualkeyboard]') ||
      document.querySelector('main [contenteditable="true"]');
  }

  function findSendButton() {
    return document.querySelector('button[data-testid="send-button"]') ||
      document.querySelector('button[aria-label*="Send" i]') ||
      document.querySelector('form button[type="submit"]');
  }

  function isGenerating() {
    return Boolean(document.querySelector('button[data-testid="stop-button"], button[aria-label*="Stop" i]'));
  }

  function assistantMessages() {
    const direct = [...document.querySelectorAll('[data-message-author-role="assistant"]')];
    if (direct.length) return direct;
    return [...document.querySelectorAll('main article')].filter((node) => /chatgpt/i.test(node.getAttribute('aria-label') || ''));
  }

  function lastAssistantText() {
    const messages = assistantMessages();
    return messages.length ? (messages[messages.length - 1].innerText || '') : '';
  }

  function setComposerText(text) {
    const composer = findComposer();
    if (!composer) return false;
    composer.focus();
    if (composer.tagName === 'TEXTAREA') {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      if (setter) setter.call(composer, text); else composer.value = text;
      composer.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      composer.textContent = text;
      composer.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    }
    return true;
  }

  async function submitPrompt(text) {
    if (!setComposerText(text)) throw new Error('Open a ChatGPT conversation first.');
    await sleep(250);
    const send = findSendButton();
    if (!send || send.disabled) throw new Error('The ChatGPT send button is unavailable.');
    send.click();
  }

  function showToast(message) {
    const toast = el('div', 'cgg-toast', message); document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    setTimeout(() => { toast.classList.remove('is-visible'); setTimeout(() => toast.remove(), 200); }, 2600);
  }

  async function stopRun(message = 'Goal loop stopped.') {
    if (runnerTimer) clearTimeout(runnerTimer);
    runnerTimer = null; runnerBusy = false;
    await store.clearActiveRun();
    showToast(message);
    await renderGoals();
  }

  async function completeGoal(goal) {
    await store.upsertGoal({ ...goal, progress: 100, status: 'done' });
    await stopRun('Goal completed.');
  }

  async function runnerTick() {
    if (runnerBusy) return;
    runnerBusy = true;
    try {
      const run = await store.getActiveRun();
      if (!run) return;
      const goal = (await store.getGoals()).find((item) => item.id === run.goalId);
      if (!goal || goal.status === 'done') { await stopRun(goal ? 'Goal is already complete.' : 'Goal no longer exists.'); return; }

      if (isGenerating()) { scheduleTick(1500); return; }
      const messages = assistantMessages();
      const latest = lastAssistantText();

      if (messages.length <= run.assistantCount) { scheduleTick(1200); return; }
      if (/\[GOAL_COMPLETE\]/i.test(latest)) { await completeGoal(goal); return; }
      if (run.turn >= goal.maxTurns) { await stopRun(`Stopped after ${goal.maxTurns} turns. Review the result before continuing.`); return; }

      const nextRun = { ...run, turn: run.turn + 1, assistantCount: messages.length, updatedAt: new Date().toISOString() };
      await store.setActiveRun(nextRun);
      await submitPrompt(store.formatContinuation(goal, nextRun.turn));
      scheduleTick(1500);
    } catch (error) {
      console.error('[ChatGPT Goals]', error);
      await stopRun(error.message || 'Goal loop stopped after an error.');
    } finally {
      runnerBusy = false;
    }
  }

  function scheduleTick(delay = 1000) { if (runnerTimer) clearTimeout(runnerTimer); runnerTimer = setTimeout(runnerTick, delay); }

  async function startRun(goal) {
    const existing = await store.getActiveRun();
    if (existing) await store.clearActiveRun();
    const count = assistantMessages().length;
    const run = { goalId: goal.id, turn: 1, assistantCount: count, startedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await store.setActiveRun(run);
    await renderGoals();
    try {
      await submitPrompt(store.formatGoalContext(goal, 1));
      showToast(`Running “${goal.title}” autonomously.`);
      scheduleTick(1500);
    } catch (error) {
      await stopRun(error.message);
    }
  }

  function openGoalEditor(existing) {
    const modal = el('div', 'cgg-modal-backdrop'); const card = el('div', 'cgg-modal');
    const title = el('h2', '', existing ? 'Edit goal' : 'New goal');
    const titleInput = el('input', 'cgg-input'); titleInput.placeholder = 'What are you trying to achieve?'; titleInput.value = existing?.title || '';
    const description = el('textarea', 'cgg-input cgg-textarea'); description.placeholder = 'Definition of done, constraints, and relevant context'; description.value = existing?.description || '';
    const progressLabel = el('label', 'cgg-label', `Progress: ${existing?.progress || 0}%`);
    const progress = el('input', 'cgg-range'); progress.type = 'range'; progress.min = '0'; progress.max = '100'; progress.value = String(existing?.progress || 0);
    progress.addEventListener('input', () => { progressLabel.textContent = `Progress: ${progress.value}%`; });
    const turnLabel = el('label', 'cgg-label', 'Maximum autonomous turns');
    const maxTurns = el('input', 'cgg-input'); maxTurns.type = 'number'; maxTurns.min = '1'; maxTurns.max = '100'; maxTurns.value = String(existing?.maxTurns || 20);
    const actions = el('div', 'cgg-modal-actions'); const cancel = el('button', 'cgg-btn cgg-btn-secondary', 'Cancel'); const save = el('button', 'cgg-btn cgg-btn-primary', 'Save goal');
    cancel.addEventListener('click', () => modal.remove());
    save.addEventListener('click', async () => {
      if (!titleInput.value.trim()) { titleInput.focus(); return; }
      await store.upsertGoal({ ...(existing || {}), title: titleInput.value, description: description.value, progress: Number(progress.value), maxTurns: Number(maxTurns.value), status: Number(progress.value) === 100 ? 'done' : (existing?.status || 'active') });
      modal.remove(); await renderGoals();
    });
    actions.append(cancel, save); card.append(title, titleInput, description, progressLabel, progress, turnLabel, maxTurns, actions); modal.appendChild(card);
    modal.addEventListener('click', (event) => { if (event.target === modal) modal.remove(); }); document.body.appendChild(modal); titleInput.focus();
  }

  async function renderGoals() {
    if (!list) return;
    const [goals, run] = await Promise.all([store.getGoals(), store.getActiveRun()]);
    list.replaceChildren();
    if (!goals.length) { const empty = el('div', 'cgg-empty'); empty.append(el('strong', '', 'No goals yet'), el('p', '', 'Create a goal, define completion, then let ChatGPT continue autonomously.')); list.appendChild(empty); return; }
    goals.forEach((goal) => {
      const isRunning = run?.goalId === goal.id;
      const card = el('article', `cgg-goal${isRunning ? ' is-running' : ''}`);
      const head = el('div', 'cgg-goal-head'); const heading = el('h3', '', goal.title); const badge = el('span', `cgg-badge cgg-${isRunning ? 'running' : goal.status}`, isRunning ? `running ${run.turn}/${goal.maxTurns}` : goal.status); head.append(heading, badge);
      const desc = goal.description ? el('p', 'cgg-description', goal.description) : null;
      const progressWrap = el('div', 'cgg-progress-wrap'); const progressBar = el('div', 'cgg-progress-bar'); const fill = el('span'); fill.style.width = `${goal.progress}%`; progressBar.appendChild(fill); progressWrap.append(progressBar, el('span', 'cgg-progress-text', `${goal.progress}%`));
      const actions = el('div', 'cgg-card-actions');
      const runButton = el('button', `cgg-btn ${isRunning ? 'cgg-btn-danger' : 'cgg-btn-primary'} cgg-small`, isRunning ? 'Stop' : 'Run until done');
      const edit = el('button', 'cgg-btn cgg-btn-secondary cgg-small', 'Edit'); const remove = el('button', 'cgg-icon-btn', '×'); remove.title = 'Delete goal';
      runButton.addEventListener('click', () => isRunning ? stopRun() : startRun(goal)); edit.addEventListener('click', () => openGoalEditor(goal));
      remove.addEventListener('click', async () => { if (confirm(`Delete “${goal.title}”?`)) { if (isRunning) await stopRun(); await store.removeGoal(goal.id); await renderGoals(); } });
      actions.append(runButton, edit, remove); card.append(head); if (desc) card.append(desc); card.append(progressWrap, actions); list.appendChild(card);
    });
  }

  function mount() {
    const launcher = el('button', 'cgg-launcher', 'Goals'); launcher.setAttribute('aria-label', 'Open ChatGPT Goals');
    panel = el('aside', 'cgg-panel'); const header = el('header', 'cgg-header'); const headingWrap = el('div'); headingWrap.append(el('span', 'cgg-eyebrow', 'Autonomous execution'), el('h2', '', 'Goals'));
    const close = el('button', 'cgg-icon-btn', '×'); close.setAttribute('aria-label', 'Close goals'); header.append(headingWrap, close);
    const add = el('button', 'cgg-btn cgg-btn-primary cgg-add', '+ New goal'); list = el('div', 'cgg-list'); const footer = el('footer', 'cgg-footer', 'Local storage · automatic turns require this tab to remain open');
    panel.append(header, add, list, footer); document.body.append(launcher, panel);
    launcher.addEventListener('click', () => panel.classList.toggle('is-open')); close.addEventListener('click', () => panel.classList.remove('is-open')); add.addEventListener('click', () => openGoalEditor());
    chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && (changes[store.STORAGE_KEY] || changes[store.RUN_KEY])) renderGoals(); });
    renderGoals(); store.getActiveRun().then((run) => { if (run) scheduleTick(800); });
  }

  mount();
})();
