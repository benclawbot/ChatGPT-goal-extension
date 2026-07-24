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
  const normalized = store.normalizeGoal({ title: ' Ship it ', progress: 120, maxTurns: 999 });
  assert.equal(normalized.title, 'Ship it');
  assert.equal(normalized.progress, 100);
  assert.equal(normalized.maxTurns, 100);

  await store.upsertGoal({ id: '1', title: 'Build extension', progress: 25, maxTurns: 12 });
  let goals = await store.getGoals();
  assert.equal(goals.length, 1);
  assert.equal(goals[0].maxTurns, 12);

  const prompt = store.formatGoalContext({ ...goals[0], milestones: [{ id: 'm', title: 'Publish repo', done: false }] }, 1);
  assert(prompt.includes('AUTONOMOUS GOAL MODE'));
  assert(prompt.includes('[GOAL_COMPLETE]'));
  assert(prompt.includes('Publish repo'));

  const continuation = store.formatContinuation(goals[0], 2);
  assert(continuation.includes('turn 2 of 12'));

  await store.setActiveRun({ goalId: '1', turn: 1 });
  assert.equal((await store.getActiveRun()).goalId, '1');
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
