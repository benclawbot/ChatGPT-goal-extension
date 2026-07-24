const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const code = fs.readFileSync(require('path').join(__dirname, '../src/store.js'), 'utf8');
const memory = {};
const context = {
  globalThis: {},
  crypto: { randomUUID: () => 'test-id' },
  chrome: { storage: { local: {
    get: async (key) => ({ [key]: memory[key] }),
    set: async (value) => Object.assign(memory, value),
    remove: async (key) => { delete memory[key]; }
  }}},
  Date,
  Math
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(code, context);
const store = context.ChatGPTGoalStore;

(async () => {
  const normalized = store.normalizeGoal({ title: ' Ship it ', progress: 120, maxTurns: 999, verificationConfidence: 2 });
  assert.equal(normalized.title, 'Ship it');
  assert.equal(normalized.progress, 100);
  assert.equal(normalized.maxTurns, 100);
  assert.equal(normalized.verificationConfidence, 1);

  await store.upsertGoal({ id: '1', title: 'Build extension', description: 'Tests pass and README updated', progress: 25, maxTurns: 12, verificationConfidence: 0.9 });
  let goals = await store.getGoals();
  assert.equal(goals.length, 1);
  assert.equal(goals[0].maxTurns, 12);

  const work = store.formatGoalContext(goals[0], 1);
  assert(work.includes('AUTONOMOUS GOAL MODE'));
  assert(work.includes('Tests pass and README updated'));
  assert(!work.includes('[GOAL_COMPLETE]'));

  const verify = store.formatVerification(goals[0], 'Implemented tests.', 1);
  assert(verify.includes('<GOAL_VERDICT>'));
  assert(verify.includes('LATEST WORK RESPONSE'));

  const verdict = store.parseVerification('<GOAL_VERDICT>{"complete":true,"confidence":0.95,"satisfiedCriteria":["tests"],"remainingCriteria":[],"evidence":["test output passed"],"nextAction":""}</GOAL_VERDICT>');
  assert.equal(verdict.complete, true);
  assert.equal(store.isVerifiedComplete(goals[0], verdict), true);

  assert.equal(store.isVerifiedComplete(goals[0], { ...verdict, confidence: 0.7 }), false);
  assert.equal(store.isVerifiedComplete(goals[0], { ...verdict, evidence: [] }), false);
  assert.equal(store.parseVerification('not json'), null);

  const continuation = store.formatContinuation(goals[0], 2, { confidence: 0.6, remainingCriteria: ['README'], nextAction: 'Update README' });
  assert(continuation.includes('WORK TURN: 2 of 12'));
  assert(continuation.includes('Update README'));
  assert(continuation.includes('Tests pass and README updated'));

  await store.setActiveRun({ goalId: '1', turn: 1, phase: 'work' });
  assert.equal((await store.getActiveRun()).phase, 'work');
  await store.clearActiveRun();
  assert.equal(await store.getActiveRun(), null);

  await store.removeGoal('1');
  goals = await store.getGoals();
  assert.equal(goals.length, 0);
  console.log('store tests passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
