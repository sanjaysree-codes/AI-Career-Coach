import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanOutput, runJudge0 } from '../src/code-judge.js';

const original = { url: process.env.CODE_JUDGE_URL, key: process.env.CODE_JUDGE_API_KEY };
const question = {
  visibleTestCases: [{ input: '2 3', expected: '5\n' }],
  hiddenTestCases: [{ input: '4 5', expected: '9' }],
};

test('Judge0 submits batch cases, polls results, and keeps hidden details out of run output', async () => {
  process.env.CODE_JUDGE_URL = 'https://judge.example/api';
  process.env.CODE_JUDGE_API_KEY = 'test-secret';
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (options.method === 'POST') return { ok: true, json: async () => [{ token: 'visible' }] };
    return { ok: true, json: async () => ({ submissions: [{ token: 'visible', status: { id: 3, description: 'Accepted' }, stdout: '5\n', time: '0.01', memory: 1000 }] }) };
  };
  try {
    const result = await runJudge0({ code: 'print(1)', language: 'python', question, fetchImpl, sleep: async () => {} });
    assert.equal(calls.length, 2);
    const submitted = JSON.parse(calls[0].options.body);
    assert.equal(submitted.submissions.length, 1);
    assert.equal(submitted.submissions[0].language_id, 71);
    assert.equal(calls[0].options.headers['X-Auth-Token'], 'test-secret');
    assert.equal(result.passedTests, 1);
    assert.equal(result.totalTests, 1);
    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].input, '2 3');
  } finally {
    if (original.url === undefined) delete process.env.CODE_JUDGE_URL; else process.env.CODE_JUDGE_URL = original.url;
    if (original.key === undefined) delete process.env.CODE_JUDGE_API_KEY; else process.env.CODE_JUDGE_API_KEY = original.key;
  }
});

test('Judge0 submit includes hidden cases in authoritative score', async () => {
  process.env.CODE_JUDGE_URL = 'https://judge.example';
  const calls = [];
  const fetchImpl = async (_url, options = {}) => {
    calls.push(options);
    if (options.method === 'POST') return { ok: true, json: async () => [{ token: 'a' }, { token: 'b' }] };
    return { ok: true, json: async () => ({ submissions: [
      { status: { id: 3, description: 'Accepted' }, stdout: '5' },
      { status: { id: 3, description: 'Accepted' }, stdout: '9' },
    ] }) };
  };
  try {
    const result = await runJudge0({ code: '...', language: 'javascript', question, includeHidden: true, fetchImpl, sleep: async () => {} });
    assert.equal(JSON.parse(calls[0].body).submissions.length, 2);
    assert.equal(result.passedTests, 2);
    assert.equal(result.totalTests, 2);
    assert.equal(result.results.length, 1);
  } finally {
    if (original.url === undefined) delete process.env.CODE_JUDGE_URL; else process.env.CODE_JUDGE_URL = original.url;
    if (original.key === undefined) delete process.env.CODE_JUDGE_API_KEY; else process.env.CODE_JUDGE_API_KEY = original.key;
  }
});

test('Judge0 keeps all five supported languages available with default IDs', async () => {
  process.env.CODE_JUDGE_URL = 'https://judge.example';
  delete process.env.CODE_JUDGE_LANGUAGE_IDS;
  const expected = { javascript: 63, python: 71, java: 62, c: 50, cpp: 54 };
  for (const [language, languageId] of Object.entries(expected)) {
    const calls = [];
    const fetchImpl = async (_url, options = {}) => {
      calls.push(options);
      if (options.method === 'POST') return { ok: true, json: async () => [{ token: 'case' }] };
      return { ok: true, json: async () => ({ submissions: [{ status: { id: 3, description: 'Accepted' }, stdout: '5' }] }) };
    };
    const result = await runJudge0({ code: 'solution', language, question, fetchImpl, sleep: async () => {} });
    assert.equal(JSON.parse(calls[0].body).submissions[0].language_id, languageId);
    assert.equal(result.passedTests, 1);
  }
  try {
    await assert.rejects(runJudge0({ code: '', language: 'ruby', question, fetchImpl: async () => { throw new Error('unsupported language should not call the judge'); } }), /JavaScript, Python, Java, C, and C\+\+/);
  } finally {
    if (original.url === undefined) delete process.env.CODE_JUDGE_URL; else process.env.CODE_JUDGE_URL = original.url;
    if (original.key === undefined) delete process.env.CODE_JUDGE_API_KEY; else process.env.CODE_JUDGE_API_KEY = original.key;
  }
});

test('judge output normalization tolerates trailing whitespace', () => {
  assert.equal(cleanOutput('2 3\r\n '), '2 3');
});
