import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAndSaveInterviewAnswer, findReusableInterview, generateInterviewQuestions } from '../src/interview-ai.js';

const feedback = { score: 84, strengths: ['Specific example'], improvements: ['Explain the outcome'] };

function sessionFixture() {
  return {
    questions: [{ text: 'Tell me about a challenge.' }, { text: 'How did you resolve it?' }],
    answers: [], evaluations: [], currentQuestionIndex: 0, status: 'in_progress', saves: 0,
    async save() { this.saves++; },
  };
}

test('a user reuses only their own in-progress interview for the same company', async () => {
  const active = sessionFixture();
  active.userId = 'user-a';
  active.companyId = 'google';
  let filter;
  const Interview = { async findOne(query) { filter = query; return query.userId === active.userId && query.companyId === active.companyId ? active : null; } };

  assert.equal(await findReusableInterview(Interview, 'user-a', 'google'), active);
  assert.deepEqual(filter, { userId: 'user-a', companyId: 'google', status: 'in_progress' });
  assert.equal(await findReusableInterview(Interview, 'user-b', 'google'), null);
  assert.equal(await findReusableInterview(Interview, 'user-a', 'meta'), null);
});

test('successful interview question generation validates and returns eight questions', async () => {
  let calls = 0;
  const questions = Array.from({ length: 8 }, (_, index) => ({ text: `Question ${index + 1}`, category: 'experience' }));
  const result = await generateInterviewQuestions({
    companyName: 'Google', targetRole: 'Software Engineer', resumeText: 'Private resume text',
    generate: async () => { calls++; return { questions }; },
  });
  assert.equal(calls, 1);
  assert.deepEqual(result, questions);
});

test('quota failure preserves the submitted answer and interview progress', async () => {
  const session = sessionFixture();
  const before = { answers: [...session.answers], evaluations: [...session.evaluations], index: session.currentQuestionIndex, status: session.status };
  const quotaError = Object.assign(new Error('Please wait for the quota to reset.'), { status: 429 });

  await assert.rejects(evaluateAndSaveInterviewAnswer(session, 'I resolved a difficult project issue.', async () => { throw quotaError; }), error => error === quotaError);
  assert.deepEqual(session.answers, before.answers);
  assert.deepEqual(session.evaluations, before.evaluations);
  assert.equal(session.currentQuestionIndex, before.index);
  assert.equal(session.status, before.status);
  assert.equal(session.saves, 0);
});

test('successful interview feedback is saved once and advances progress', async () => {
  const session = sessionFixture();
  let calls = 0;

  const result = await evaluateAndSaveInterviewAnswer(session, 'I resolved a difficult project issue.', async () => { calls++; return feedback; });
  assert.equal(calls, 1);
  assert.deepEqual(result, feedback);
  assert.deepEqual(session.answers, [{ questionIndex: 0, answer: 'I resolved a difficult project issue.' }]);
  assert.deepEqual(session.evaluations, [feedback]);
  assert.equal(session.currentQuestionIndex, 1);
  assert.equal(session.status, 'in_progress');
  assert.equal(session.saves, 1);
});
