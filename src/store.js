(function (global) {
  'use strict';

  const STORAGE_KEY = 'chatgptGoals.v1';
  const RUN_KEY = 'chatgptGoals.activeRun.v1';

  function makeId() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') return global.crypto.randomUUID();
    return `goal-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function normalizeGoal(goal) {
    const now = new Date().toISOString();
    return {
      id: String(goal.id || makeId()),
      title: String(goal.title || '').trim(),
      description: String(goal.description || '').trim(),
      progress: Math.max(0, Math.min(100, Number(goal.progress) || 0)),
      status: ['active', 'paused', 'done'].includes(goal.status) ? goal.status : 'active',
      maxTurns: Math.max(1, Math.min(100, Number(goal.maxTurns) || 20)),
      milestones: Array.isArray(goal.milestones)
        ? goal.milestones.map((m) => ({ id: String(m.id || makeId()), title: String(m.title || '').trim(), done: Boolean(m.done) })).filter((m) => m.title)
        : [],
      createdAt: goal.createdAt || now,
      updatedAt: now
    };
  }

  async function getGoals() {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const goals = Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];
    return goals.map(normalizeGoal);
  }

  async function saveGoals(goals) {
    const clean = goals.map(normalizeGoal).filter((goal) => goal.title);
    await chrome.storage.local.set({ [STORAGE_KEY]: clean });
    return clean;
  }

  async function upsertGoal(goal) {
    const goals = await getGoals();
    const normalized = normalizeGoal(goal);
    const index = goals.findIndex((item) => item.id === normalized.id);
    if (index >= 0) goals[index] = normalized;
    else goals.unshift(normalized);
    return saveGoals(goals);
  }

  async function removeGoal(id) {
    const goals = await getGoals();
    return saveGoals(goals.filter((goal) => goal.id !== id));
  }

  async function getActiveRun() {
    const result = await chrome.storage.local.get(RUN_KEY);
    return result[RUN_KEY] || null;
  }

  async function setActiveRun(run) {
    await chrome.storage.local.set({ [RUN_KEY]: run });
    return run;
  }

  async function clearActiveRun() {
    await chrome.storage.local.remove(RUN_KEY);
  }

  function formatGoalContext(goal, turn = 1) {
    const openMilestones = goal.milestones.filter((m) => !m.done).map((m) => `- ${m.title}`);
    const doneMilestones = goal.milestones.filter((m) => m.done).map((m) => `- ${m.title}`);
    return [
      'You are operating in AUTONOMOUS GOAL MODE.',
      `Goal: ${goal.title}`,
      goal.description ? `Definition of done / constraints: ${goal.description}` : '',
      `Recorded progress: ${goal.progress}%`,
      openMilestones.length ? `Open milestones:\n${openMilestones.join('\n')}` : '',
      doneMilestones.length ? `Completed milestones:\n${doneMilestones.join('\n')}` : '',
      `Autonomous turn: ${turn} of ${goal.maxTurns}`,
      'Work on the goal now. Do not merely describe what could be done: perform the next useful work available in this chat and continue from prior results.',
      'Do not ask for confirmation unless a genuinely irreversible or safety-critical decision requires it. Make reasonable assumptions and state them briefly.',
      'When the entire definition of done is satisfied, end your response with the exact marker [GOAL_COMPLETE]. Otherwise end with a concise statement of the next action, and the extension will ask you to continue.'
    ].filter(Boolean).join('\n\n');
  }

  function formatContinuation(goal, turn) {
    return [
      `Continue autonomous work on the persistent goal: ${goal.title}`,
      `This is turn ${turn} of ${goal.maxTurns}.`,
      'Use the conversation and all work already completed. Execute the next necessary step rather than repeating the plan or waiting for me.',
      'When the complete goal is achieved, end with the exact marker [GOAL_COMPLETE]. Otherwise continue making concrete progress.'
    ].join('\n\n');
  }

  global.ChatGPTGoalStore = {
    STORAGE_KEY, RUN_KEY, normalizeGoal, getGoals, saveGoals, upsertGoal, removeGoal,
    getActiveRun, setActiveRun, clearActiveRun, formatGoalContext, formatContinuation
  };
})(typeof window !== 'undefined' ? window : globalThis);
