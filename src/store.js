(function (global) {
  'use strict';

  const STORAGE_KEY = 'chatgptGoals.v1';
  const RUN_KEY = 'chatgptGoals.activeRun.v1';
  const VERDICT_START = '<GOAL_VERDICT>';
  const VERDICT_END = '</GOAL_VERDICT>';

  function makeId() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') return global.crypto.randomUUID();
    return `goal-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function clamp(value, min, max, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
  }

  function normalizeGoal(goal) {
    const now = new Date().toISOString();
    return {
      id: String(goal.id || makeId()),
      title: String(goal.title || '').trim(),
      description: String(goal.description || '').trim(),
      progress: clamp(goal.progress, 0, 100, 0),
      status: ['active', 'paused', 'done'].includes(goal.status) ? goal.status : 'active',
      maxTurns: clamp(goal.maxTurns, 1, 100, 20),
      verificationConfidence: clamp(goal.verificationConfidence, 0.5, 1, 0.85),
      milestones: Array.isArray(goal.milestones)
        ? goal.milestones.map((m) => ({
          id: String(m.id || makeId()),
          title: String(m.title || '').trim(),
          done: Boolean(m.done)
        })).filter((m) => m.title)
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

  function milestoneLines(goal) {
    const milestones = goal.milestones || [];
    if (!milestones.length) return 'No explicit milestones were recorded.';
    return milestones.map((m) => `- [${m.done ? 'x' : ' '}] ${m.title}`).join('\n');
  }

  function fullGoalBrief(goal) {
    return [
      `GOAL: ${goal.title}`,
      goal.description ? `DEFINITION OF DONE / CONSTRAINTS:\n${goal.description}` : 'DEFINITION OF DONE / CONSTRAINTS: Complete the stated goal fully and provide verifiable evidence.',
      `RECORDED PROGRESS: ${goal.progress}%`,
      `MILESTONES:\n${milestoneLines(goal)}`,
      `MINIMUM COMPLETION CONFIDENCE: ${Math.round(goal.verificationConfidence * 100)}%`
    ].join('\n\n');
  }

  function formatGoalContext(goal, turn = 1) {
    return [
      'You are operating in AUTONOMOUS GOAL MODE.',
      fullGoalBrief(goal),
      `WORK TURN: ${turn} of ${goal.maxTurns}`,
      'Perform concrete work toward the goal now. Do not merely plan, summarize possibilities, or stop after giving feedback.',
      'Use every capability available in this chat. Continue from existing conversation results, make reasonable reversible assumptions, and document blockers only when they cannot be resolved here.',
      'Do not declare the goal complete. After this work response, a separate verification turn will compare the result against the complete original goal.'
    ].join('\n\n');
  }

  function formatVerification(goal, workResponse, turn) {
    const candidate = String(workResponse || '').slice(-14000);
    return [
      'Act as a strict goal-completion verifier. Do not perform more work in this response and do not trust a completion claim from the previous response.',
      fullGoalBrief(goal),
      `WORK TURN BEING VERIFIED: ${turn} of ${goal.maxTurns}`,
      `LATEST WORK RESPONSE:\n${candidate}`,
      'Compare all available conversation evidence against every part of the original goal and definition of done.',
      `Return exactly one JSON object between ${VERDICT_START} and ${VERDICT_END}, with no text outside the tags.`,
      `${VERDICT_START}\n{"complete":false,"confidence":0.0,"satisfiedCriteria":[],"remainingCriteria":[],"evidence":[],"nextAction":""}\n${VERDICT_END}`,
      'Rules: complete may be true only when every criterion is satisfied; confidence must be 0 to 1; evidence must cite concrete outputs, checks, files, actions, or results visible in this conversation; remainingCriteria must be empty for completion; nextAction must be the single highest-value executable action when incomplete.'
    ].join('\n\n');
  }

  function formatContinuation(goal, turn, verdict) {
    const remaining = Array.isArray(verdict?.remainingCriteria) && verdict.remainingCriteria.length
      ? verdict.remainingCriteria.map((item) => `- ${item}`).join('\n')
      : '- Reassess the full definition of done and close the most important gap.';
    const nextAction = String(verdict?.nextAction || '').trim() || 'Execute the next concrete step needed to satisfy the original goal.';
    return [
      'Continue AUTONOMOUS GOAL MODE. The verifier determined that the goal is not yet complete.',
      fullGoalBrief(goal),
      `WORK TURN: ${turn} of ${goal.maxTurns}`,
      `VERIFIER CONFIDENCE: ${Math.round(clamp(verdict?.confidence, 0, 1, 0) * 100)}%`,
      `REMAINING CRITERIA:\n${remaining}`,
      `NEXT ACTION:\n${nextAction}`,
      'Perform the next action now. Do not repeat the plan, ask whether to continue, or claim completion. A separate verification turn will evaluate the result.'
    ].join('\n\n');
  }

  function parseVerification(text) {
    const source = String(text || '');
    const start = source.indexOf(VERDICT_START);
    const end = source.indexOf(VERDICT_END, start + VERDICT_START.length);
    if (start < 0 || end < 0) return null;
    const raw = source.slice(start + VERDICT_START.length, end).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try {
      const parsed = JSON.parse(raw);
      return {
        complete: parsed.complete === true,
        confidence: clamp(parsed.confidence, 0, 1, 0),
        satisfiedCriteria: Array.isArray(parsed.satisfiedCriteria) ? parsed.satisfiedCriteria.map(String) : [],
        remainingCriteria: Array.isArray(parsed.remainingCriteria) ? parsed.remainingCriteria.map(String) : [],
        evidence: Array.isArray(parsed.evidence) ? parsed.evidence.map(String).filter(Boolean) : [],
        nextAction: String(parsed.nextAction || '').trim()
      };
    } catch (_) {
      return null;
    }
  }

  function isVerifiedComplete(goal, verdict) {
    return Boolean(
      verdict && verdict.complete === true &&
      verdict.confidence >= goal.verificationConfidence &&
      verdict.remainingCriteria.length === 0 &&
      verdict.evidence.length > 0
    );
  }

  global.ChatGPTGoalStore = {
    STORAGE_KEY, RUN_KEY, VERDICT_START, VERDICT_END,
    normalizeGoal, getGoals, saveGoals, upsertGoal, removeGoal,
    getActiveRun, setActiveRun, clearActiveRun,
    fullGoalBrief, formatGoalContext, formatVerification, formatContinuation,
    parseVerification, isVerifiedComplete
  };
})(typeof window !== 'undefined' ? window : globalThis);
