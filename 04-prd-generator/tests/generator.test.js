'use strict';

const assert = require('node:assert/strict');
const generator = require('../generator.js');
const { createDraftRepository, STORAGE_KEY } = require('../storage.js');

class MemoryStorage {
  constructor() { this.data = new Map(); }
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}

const sample = {
  name: 'FocusFlow',
  idea: 'A guided weekly planning workspace for independent professionals.',
  problem: 'Independent professionals lose focus because priorities are spread across notes, calendars, and task tools.',
  users: 'Independent consultants, Freelance designers',
  goals: 'Increase weekly planning completion, Reduce time spent reorganizing tasks',
  painPoints: 'Priorities are fragmented, Plans become outdated quickly, Existing tools feel too complex',
  solution: 'A lightweight weekly planning flow that turns goals into a focused schedule.',
  constraints: 'Browser only for MVP, No calendar integration in the first release'
};

assert.equal(generator.validateInput(sample).valid, true, 'valid input should pass');
assert.equal(generator.validateInput({ ...sample, problem: '' }).valid, false, 'missing problem should fail');

const first = generator.generate(sample);
const second = generator.generate(sample);
assert.equal(first.isAIGenerated, false, 'output must not claim AI generation');
assert.equal(first.generator, 'Deterministic template engine');
assert.equal(first.sections.length, 13, 'all required PRD sections should be present');
assert.deepEqual(first.sections.map(section => section.content), second.sections.map(section => section.content), 'same input should create deterministic content');

const required = ['overview', 'problem', 'goals', 'users', 'pain-points', 'solution', 'requirements', 'stories', 'non-functional', 'scope', 'metrics', 'risks', 'questions'];
assert.deepEqual(first.sections.map(section => section.id), required);
assert.match(first.sections.find(section => section.id === 'requirements').content, /FR-1/);
assert.match(first.sections.find(section => section.id === 'stories').content, /Acceptance criteria/);
assert.match(first.sections.find(section => section.id === 'metrics').content, /Targets are intentionally unset/);

const regenerated = generator.regenerateSection(first, 'requirements');
assert.equal(regenerated.sections.find(section => section.id === 'requirements').iteration, 1);
assert.notEqual(regenerated.sections.find(section => section.id === 'requirements').content, first.sections.find(section => section.id === 'requirements').content, 'regeneration should provide an alternative');
assert.equal(regenerated.sections.find(section => section.id === 'problem').content, first.sections.find(section => section.id === 'problem').content, 'other sections should not change');

const markdown = generator.toMarkdown(first);
assert.match(markdown, /^# FocusFlow/);
assert.match(markdown, /not AI-generated output/i);
assert.match(markdown, /## 13\. Open questions/);

const storage = new MemoryStorage();
const drafts = createDraftRepository(storage);
const saved = drafts.save(first);
assert.equal(drafts.list().length, 1, 'draft should save');
assert.equal(drafts.get(saved.id).title, 'FocusFlow', 'draft should reopen');
drafts.save({ ...saved, title: 'FocusFlow Revised' });
assert.equal(drafts.get(saved.id).title, 'FocusFlow Revised', 'draft should update');
assert.ok(storage.getItem(STORAGE_KEY), 'draft should persist');
assert.equal(drafts.remove(saved.id), true, 'draft should delete');
assert.equal(drafts.list().length, 0, 'deleted draft should be gone');

console.log('PRD generator tests passed: validation, generation, regeneration, Markdown, and draft persistence');
