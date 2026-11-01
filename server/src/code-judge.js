import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, chmod, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const DEFAULT_LANGUAGE_IDS = { javascript: 63, java: 62, python: 71, c: 50, cpp: 54 };
const LOCAL_RUNTIMES = {
  javascript: { image: 'node:22-alpine', file: 'main.js', command: ['node', '/input/main.js'] },
  python: { image: 'python:3.12-alpine', file: 'main.py', command: ['python', '-B', '/input/main.py'] },
  java: { image: 'eclipse-temurin:21-jdk-alpine', file: 'Main.java', command: ['sh', '-c', 'mkdir -p /tmp/classes && javac -encoding UTF-8 -d /tmp/classes /input/Main.java && exec java -cp /tmp/classes Main'] },
  c: { image: 'gcc:14', file: 'main.c', command: ['sh', '-c', 'gcc -std=c17 -O2 -pipe -o /work/main /input/main.c && exec /work/main'], needsExecutableTmpfs: true },
  cpp: { image: 'gcc:14', file: 'main.cpp', command: ['sh', '-c', 'g++ -std=c++20 -O2 -pipe -o /work/main /input/main.cpp && exec /work/main'], needsExecutableTmpfs: true },
};
const SUPPORTED_LANGUAGES = 'JavaScript, Python, Java, C, and C++';
const MAX_CODE_BYTES = 64 * 1024;
const MAX_CASE_BYTES = 16 * 1024;
const MAX_OUTPUT_BYTES = 64 * 1024;
const RUN_TIMEOUT_MS = 8000;
const MAX_CONCURRENT_LOCAL_RUNS = 2;
let activeLocalRuns = 0;

function cleanOutput(value = '') {
  return String(value).replace(/\r\n/g, '\n').trim();
}

function languageIds() {
  try {
    return { ...DEFAULT_LANGUAGE_IDS, ...JSON.parse(process.env.CODE_JUDGE_LANGUAGE_IDS || '{}') };
  } catch {
    throw new Error('CODE_JUDGE_LANGUAGE_IDS must be valid JSON.');
  }
}

function judgeHeaders() {
  return {
    'Content-Type': 'application/json',
    ...(process.env.CODE_JUDGE_API_KEY ? { 'X-Auth-Token': process.env.CODE_JUDGE_API_KEY } : {}),
  };
}

function judgeUrl(path) {
  return `${process.env.CODE_JUDGE_URL.replace(/\/+$/, '')}${path}`;
}

export async function runJudge0({ code, language, question, includeHidden = false, fetchImpl = fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  if (!process.env.CODE_JUDGE_URL) throw new Error('Secure code judging is not configured. Add CODE_JUDGE_URL before running or submitting code.');
  if (!Object.hasOwn(LOCAL_RUNTIMES, language)) throw new Error(`Choose a supported language: ${SUPPORTED_LANGUAGES}.`);
  const languageId = languageIds()[language];
  if (!languageId) throw new Error(`Choose a supported language: ${SUPPORTED_LANGUAGES}.`);
  const testCases = [...(question.visibleTestCases || []), ...(includeHidden ? question.hiddenTestCases || [] : [])];
  if (!testCases.length) throw new Error('This coding problem has no validated judge cases.');

  const submissions = testCases.map(test => ({
    language_id: languageId,
    source_code: code,
    stdin: String(test.input ?? ''),
    expected_output: String(test.expected ?? ''),
    cpu_time_limit: 2,
    wall_time_limit: 5,
    memory_limit: 128000,
  }));
  const created = await fetchImpl(judgeUrl('/submissions/batch?base64_encoded=false'), {
    method: 'POST', headers: judgeHeaders(), body: JSON.stringify({ submissions }), signal: AbortSignal.timeout(15000),
  });
  if (!created.ok) throw new Error('The code judge is temporarily unavailable. Your solution is still here.');
  const tokens = await created.json();
  if (!Array.isArray(tokens) || tokens.length !== submissions.length || tokens.some(row => !row.token)) {
    throw new Error('The code judge returned invalid submission tokens.');
  }

  let rows = [];
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    await sleep(300);
    const url = new URL(judgeUrl('/submissions/batch'));
    url.searchParams.set('tokens', tokens.map(row => row.token).join(','));
    url.searchParams.set('base64_encoded', 'false');
    url.searchParams.set('fields', 'token,status,stdout,stderr,compile_output,time,memory');
    const response = await fetchImpl(url.toString(), {
      headers: judgeHeaders(), signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('The code judge could not retrieve the execution results.');
    const result = await response.json();
    rows = result.submissions || result;
    if (!Array.isArray(rows) || rows.length !== tokens.length) throw new Error('The code judge returned invalid execution results.');
    if (rows.every(row => row.status && ![1, 2].includes(row.status.id))) break;
  }
  if (rows.length !== tokens.length || rows.some(row => !row.status || [1, 2].includes(row.status.id))) {
    throw new Error('Code execution timed out. Please try again.');
  }

  const results = rows.map((row, index) => ({
    passed: row.status.id === 3 && cleanOutput(row.stdout) === cleanOutput(testCases[index].expected),
    input: testCases[index].input,
    expected: testCases[index].expected,
    actual: row.stdout ?? row.compile_output ?? row.stderr ?? row.status.description,
    status: row.status.description,
    runtime: row.time,
    memory: row.memory,
  }));
  const passedTests = results.filter(result => result.passed).length;
  return {
    status: passedTests === testCases.length ? 'Accepted' : results.find(result => !result.passed)?.status || 'Wrong Answer',
    passedTests,
    totalTests: testCases.length,
    runtime: rows.map(row => Number(row.time) || 0).reduce((sum, value) => sum + value, 0),
    memory: Math.max(...rows.map(row => Number(row.memory) || 0)),
    results: results.slice(0, (question.visibleTestCases || []).length),
  };
}

function docker(args, { input = '', timeout = 15000, maxBuffer = MAX_OUTPUT_BYTES } = {}) {
  return new Promise(resolve => {
    let child;
    try {
      child = spawn('docker', args, { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (error) {
      resolve({ spawnError: error });
      return;
    }

    const startedAt = Date.now();
    let stdout = Buffer.alloc(0), stderr = Buffer.alloc(0), timedOut = false, outputLimited = false, spawnError;
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, timeout);
    const collect = (target, chunk) => {
      if (target.length + chunk.length > maxBuffer) {
        outputLimited = true;
        child.kill();
        return target;
      }
      return Buffer.concat([target, chunk]);
    };
    child.stdout.on('data', chunk => { stdout = collect(stdout, chunk); });
    child.stderr.on('data', chunk => { stderr = collect(stderr, chunk); });
    child.once('error', error => { spawnError = error; });
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, timedOut, outputLimited, spawnError, elapsedMs: Date.now() - startedAt, stdout: stdout.toString('utf8'), stderr: stderr.toString('utf8') });
    });
    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });
}

function dockerUnavailable(result) {
  return result.spawnError?.code === 'ENOENT'
    ? 'Local code execution requires Docker Engine. Install and start Docker, then pull the three runtime images listed in CODE_JUDGE.md.'
    : 'Docker Engine is unavailable. Start Docker and try again.';
}

async function runLocalDocker({ code, language, question, includeHidden = false }) {
  const runtime = Object.hasOwn(LOCAL_RUNTIMES, language) ? LOCAL_RUNTIMES[language] : null;
  if (!runtime) throw new Error(`Choose a supported language: ${SUPPORTED_LANGUAGES}.`);
  if (typeof code !== 'string' || Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES) throw new Error('Keep your solution under 64 KB.');
  const testCases = [...(question.visibleTestCases || []), ...(includeHidden ? question.hiddenTestCases || [] : [])];
  if (!testCases.length) throw new Error('This coding problem has no validated judge cases.');
  if (testCases.length > 20 || testCases.some(test => Buffer.byteLength(String(test.input ?? ''), 'utf8') > MAX_CASE_BYTES)) {
    throw new Error('This coding problem exceeds the local runner limits.');
  }

  const available = await docker(['info', '--format', '{{.ServerVersion}}']);
  if (available.spawnError || available.code !== 0) throw new Error(dockerUnavailable(available));
  const image = await docker(['image', 'inspect', runtime.image, '--format', '{{.Id}}']);
  if (image.code !== 0) throw new Error(`Required runtime image is missing. Pull it once with: docker pull ${runtime.image}`);

  const dir = await mkdtemp(path.join(os.tmpdir(), 'career-code-'));
  try {
    await chmod(dir, 0o755).catch(() => {});
    const sourceFile = path.join(dir, runtime.file);
    await writeFile(sourceFile, code, { encoding: 'utf8', mode: 0o444 });
    await chmod(sourceFile, 0o444).catch(() => {});
    if (dir.includes(',')) throw new Error('The temporary directory path is not supported by Docker bind mounts.');

    const results = [];
    for (const test of testCases) {
      const name = `career-code-${randomBytes(12).toString('hex')}`;
      const created = await docker([
        'create', '--interactive', '--name', name,
        '--network', 'none', '--read-only', '--cap-drop', 'ALL',
        '--security-opt', 'no-new-privileges:true', '--user', '65534:65534',
        '--memory', '256m', '--memory-swap', '256m', '--cpus', '1', '--pids-limit', '64',
        '--ulimit', 'core=0',
        '--tmpfs', '/tmp:rw,noexec,nosuid,nodev,size=32m,mode=1777',
        ...(runtime.needsExecutableTmpfs ? ['--tmpfs', '/work:rw,exec,nosuid,nodev,size=32m,mode=1777'] : []),
        '--mount', `type=bind,source=${dir},target=/input,readonly`,
        '--workdir', '/tmp', runtime.image, ...runtime.command,
      ]);
      if (created.spawnError?.code === 'ENOENT') throw new Error(dockerUnavailable(created));
      if (created.code !== 0) throw new Error('Docker could not create the restricted runner container. Check bind mount and daemon permissions.');
      const id = created.stdout.trim();
      if (!/^[a-f0-9]{12,64}$/i.test(id)) throw new Error('Docker returned an invalid container ID.');

      try {
        const started = await docker(['start', '--attach', '--interactive', id], {
          input: String(test.input ?? ''), timeout: RUN_TIMEOUT_MS, maxBuffer: MAX_OUTPUT_BYTES,
        });
        if (started.spawnError?.code === 'ENOENT') throw new Error(dockerUnavailable(started));
        if (started.stderr.includes('Error response from daemon:')) throw new Error('Docker Engine could not start the execution container. Start Docker and try again.');
        const status = started.timedOut ? 'Time Limit Exceeded'
          : started.outputLimited ? 'Output Limit Exceeded'
            : started.code === 0 ? (cleanOutput(started.stdout) === cleanOutput(test.expected) ? 'Accepted' : 'Wrong Answer')
              : ['java', 'c', 'cpp'].includes(language) && /error:|\.java:\d+:|\.c(?:pp)?:\d+:/i.test(started.stderr) ? 'Compilation Error' : 'Runtime Error';
        results.push({
          passed: status === 'Accepted', input: test.input, expected: test.expected,
          actual: started.timedOut ? 'Execution exceeded the 8 second limit.'
            : started.outputLimited ? 'Output exceeded the 64 KB limit.'
              : started.stdout || started.stderr || status,
          status, runtime: (started.elapsedMs || 0) / 1000, memory: 0,
        });
      } finally {
        await docker(['rm', '-f', id], { timeout: 10000 }).catch(() => {});
      }
    }

    const passedTests = results.filter(result => result.passed).length;
    return {
      status: passedTests === testCases.length ? 'Accepted' : results.find(result => !result.passed)?.status || 'Wrong Answer',
      passedTests,
      totalTests: testCases.length,
      runtime: results.reduce((sum, result) => sum + result.runtime, 0),
      memory: 0,
      results: results.slice(0, (question.visibleTestCases || []).length),
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export function runCode(options) {
  const mode = (process.env.CODE_RUNNER || 'local').trim().toLowerCase();
  if (mode === 'judge0') return runJudge0(options);
  if (mode !== 'local') throw new Error('CODE_RUNNER must be set to local or judge0.');
  if (process.env.VERCEL === '1') throw new Error('Docker code execution is not available in Vercel functions. Configure CODE_RUNNER=judge0 and CODE_JUDGE_URL (plus CODE_JUDGE_API_KEY if required) to keep coding run and submission enabled.');
  if (activeLocalRuns >= MAX_CONCURRENT_LOCAL_RUNS) throw new Error('The local code runner is busy. Please try again shortly.');
  activeLocalRuns++;
  return runLocalDocker(options).finally(() => { activeLocalRuns--; });
}

export { cleanOutput };
