import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeResumeText, geminiJson } from '../src/ai.js';

const originalFetch = globalThis.fetch;
const originalKey = process.env.GEMINI_API_KEY;
const originalModel = process.env.GEMINI_MODEL;
const originalFallbackModel = process.env.GEMINI_FALLBACK_MODEL;

test('Gemini JSON requests omit legacy sampling settings and keep the key out of the URL', async () => {
  process.env.GEMINI_API_KEY = 'test-key-never-log';
  process.env.GEMINI_MODEL = 'gemini-3.8-flash';
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url: String(url), options, body: JSON.parse(options.body) };
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }) };
  };
  try {
    assert.deepEqual(await geminiJson('system', 'resume text'), { ok: true });
    assert.equal(request.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');
    assert.equal(request.url.includes('test-key'), false);
    assert.equal(request.options.headers['x-goog-api-key'], 'test-key-never-log');
    assert.deepEqual(request.body.generationConfig, { responseMimeType: 'application/json' });
  } finally { restore(); }
});

test('Gemini 404 and 429 responses become useful model and quota errors', async () => {
  process.env.GEMINI_API_KEY = 'test-key-never-log';
  process.env.GEMINI_MODEL = 'gemini-test-model';
  try {
    globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({ error: { status: 'NOT_FOUND' } }) });
    await assert.rejects(geminiJson('system', 'prompt'), error => error.status === 503 && /model is unavailable/.test(error.message));
    globalThis.fetch = async () => ({ ok: false, status: 429, json: async () => ({ error: { status: 'RESOURCE_EXHAUSTED' } }) });
    await assert.rejects(geminiJson('system', 'prompt'), error => error.status === 429 && error.code === 'GEMINI_RATE_LIMIT' && /wait for the quota to reset/.test(error.message));
  } finally { restore(); }
});

test('resume analysis succeeds with a mocked Gemini response and bounded output', async () => {
  const expected = {
    overallScore: 82,
    summary: 'Clear experience with room for stronger impact metrics.',
    formatting: { score: 80, findings: [], recommendations: [] },
    content: { score: 84, strengths: ['Relevant experience'], weaknesses: [] },
    sections: [],
    topImprovements: ['Add measurable outcomes'],
    missingInformation: [],
    targetRole: 'Software Engineer',
  };
  let request;
  const actual = await analyzeResumeText('Resume text that must stay private.', 'Software Engineer', async (...args) => {
    request = args;
    return expected;
  });
  assert.deepEqual(actual, expected);
  assert.match(request[1], /Resume text that must stay private/);
  assert.deepEqual(request[2], { maxOutputTokens: 1400, thinkingLevel: 'low' });
});

test('resume analysis sends a bounded concise prompt and low-thinking generation config', async () => {
  process.env.GEMINI_API_KEY = 'test-key-never-log';
  process.env.GEMINI_MODEL = 'gemini-3.8-flash';
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url: String(url), body: JSON.parse(options.body) };
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({
      overallScore: 80, summary: 'Clear experience.', formatting: { score: 80, findings: [], recommendations: [] },
      content: { score: 80, strengths: [], weaknesses: [] }, sections: [], topImprovements: [], missingInformation: [], targetRole: 'Engineer',
    }) }] } }] }) };
  };
  try {
    await analyzeResumeText('x'.repeat(13000), 'Engineer');
    assert.deepEqual(request.body.generationConfig, {
      responseMimeType: 'application/json', maxOutputTokens: 1400, thinkingConfig: { thinkingLevel: 'low' },
    });
    assert.match(request.body.contents[0].parts[0].text, /x{12000}/);
    assert.doesNotMatch(request.body.contents[0].parts[0].text, /x{12001}/);
    assert.match(request.body.contents[0].parts[0].text, /concise/);
  } finally { restore(); }
});

test('Gemini timeout retries twice, then surfaces a distinct safe error', async () => {
  process.env.GEMINI_API_KEY = 'test-key-never-log';
  process.env.GEMINI_MODEL = 'gemini-same-for-timeout-test';
  process.env.GEMINI_FALLBACK_MODEL = 'gemini-same-for-timeout-test';
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new DOMException('request deadline exceeded', 'TimeoutError'); };
  try {
    await assert.rejects(geminiJson('system', 'private resume content'), error => error.status === 503 && error.code === 'GEMINI_TIMEOUT' && /took too long/.test(error.message));
    assert.equal(calls, 3);
  } finally { restore(); }
});

test('Gemini temporary UNAVAILABLE errors are retried once', async () => {
  process.env.GEMINI_API_KEY = 'test-key-never-log';
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    if (calls === 1) return { ok: false, status: 503, json: async () => ({ error: { status: 'UNAVAILABLE' } }) };
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"retried":true}' }] } }] }) };
  };
  try {
    assert.deepEqual(await geminiJson('system', 'prompt'), { retried: true });
    assert.equal(calls, 2);
  } finally { restore(); }
});

test('Gemini exhausted quota is not retried', async () => {
  process.env.GEMINI_API_KEY = 'test-key-never-log';
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return { ok: false, status: 429, json: async () => ({ error: { status: 'RESOURCE_EXHAUSTED' } }) };
  };
  try {
    await assert.rejects(geminiJson('system', 'prompt'), error => error.status === 429 && /Please wait for the quota to reset/.test(error.message));
    assert.equal(calls, 1);
  } finally { restore(); }
});

test('Gemini repeated 503 and ECONNRESET failures become safe bounded errors', async () => {
  process.env.GEMINI_API_KEY = 'test-key-never-log';
  process.env.GEMINI_MODEL = 'gemini-same-for-retry-test';
  process.env.GEMINI_FALLBACK_MODEL = 'gemini-same-for-retry-test';
  let calls = 0;
  globalThis.fetch = async () => { calls++; return { ok: false, status: 503, json: async () => ({ error: { status: 'UNAVAILABLE' } }) }; };
  try {
    await assert.rejects(geminiJson('system', 'prompt'), error => error.status === 503 && /temporarily unavailable/.test(error.message));
    assert.equal(calls, 3);
    calls = 0;
    globalThis.fetch = async () => { calls++; const error = new TypeError('fetch failed'); error.cause = { code: 'ECONNRESET' }; throw error; };
    await assert.rejects(geminiJson('system', 'prompt'), error => error.status === 503 && /Could not connect to Gemini/.test(error.message));
    assert.equal(calls, 3);
  } finally { restore(); }
});

test('Gemini retries 500, 502, 503, and 504, then uses fallback once', async () => {
  process.env.GEMINI_API_KEY = 'test-key-never-log';
  process.env.GEMINI_MODEL = 'gemini-primary-test';
  process.env.GEMINI_FALLBACK_MODEL = 'gemini-fallback-test';
  const urls = [];
  let primaryCalls = 0;
  globalThis.fetch = async url => {
    urls.push(String(url));
    if (String(url).includes('gemini-primary-test')) {
      primaryCalls++;
      return { ok: false, status: [500, 502, 503][primaryCalls - 1] || 504, json: async () => ({ error: { status: 'UNAVAILABLE' } }) };
    }
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"fallback":true}' }] } }] }) };
  };
  try {
    assert.deepEqual(await geminiJson('system', 'prompt'), { fallback: true });
    assert.equal(primaryCalls, 3);
    assert.equal(urls.length, 4);
    assert.ok(urls.slice(0, 3).every(url => url.includes('gemini-primary-test')));
    assert.ok(urls[3].includes('gemini-fallback-test'));
  } finally { restore(); }
});

test('Gemini does not retry invalid request, authentication, or permission errors', async () => {
  process.env.GEMINI_API_KEY = 'test-key-never-log';
  try {
    for (const [providerStatus, expectedStatus] of [[400, 502], [401, 503], [403, 503]]) {
      let calls = 0;
      globalThis.fetch = async () => {
        calls++;
        return { ok: false, status: providerStatus, json: async () => ({ error: { status: 'EXPECTED_TEST_ERROR' } }) };
      };
      await assert.rejects(geminiJson('system', 'prompt'), error => error.status === expectedStatus);
      assert.equal(calls, 1);
    }
  } finally { restore(); }
});

function restore() {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalKey;
  if (originalModel === undefined) delete process.env.GEMINI_MODEL;
  else process.env.GEMINI_MODEL = originalModel;
  if (originalFallbackModel === undefined) delete process.env.GEMINI_FALLBACK_MODEL;
  else process.env.GEMINI_FALLBACK_MODEL = originalFallbackModel;
}
