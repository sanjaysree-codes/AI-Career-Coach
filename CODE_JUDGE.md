# Coding challenge execution

## Local runner (default)

The API runs each submitted test case in a short-lived Docker container. No remote judge account, API key, or paid execution service is needed. Install Docker Engine on the same host as the Express API and pull the runtime images once:

```sh
docker pull python:3.12-alpine
docker pull eclipse-temurin:21-jdk-alpine
docker pull node:22-alpine
docker pull gcc:14
```

Set `CODE_RUNNER=local` (the default) or leave it unset. Python runs with Python 3.12, Java with JDK 21, JavaScript with Node 22, C with GCC 14 in C17 mode, and C++ with GCC 14 in C++20 mode. The app uses only the Docker CLI and Node built-ins; it adds no package dependencies.

Each execution has no network, a read-only root filesystem, dropped Linux capabilities, no-new-privileges, an unprivileged UID, 256 MB memory, one CPU, a 64-process limit, an 8-second timeout, and a 64 KB output cap. Source is mounted read-only; only small temporary filesystems are writable. C and C++ compile into a dedicated executable temporary filesystem while `/tmp` remains `noexec`. The API rate-limits run and submit requests and allows at most two local executions concurrently per server process. Visible test cases run in the editor; submissions also run hidden cases, whose details are not returned to the browser. Output comparison ignores surrounding whitespace and line ending differences.

The Docker daemon and runtime images must be available wherever the Express server runs. Local development works with Docker Desktop on Windows/macOS or Docker Engine on Linux. Shared hosting and serverless platforms that do not provide a Docker daemon cannot run this mode. The initial image pulls require internet access; execution afterward can run without internet. Docker uses a shared host kernel, so for a public service that accepts arbitrary code from untrusted users, use a hardened isolation runtime or dedicated judge host rather than relying on ordinary Docker alone.

## Optional Judge0 compatibility

Existing installations can retain the prior integration by setting `CODE_RUNNER=judge0`, `CODE_JUDGE_URL`, and (if required by the instance) `CODE_JUDGE_API_KEY`. Default language IDs are JavaScript 63, Java 62, Python 71, C 50, and C++ 54; `CODE_JUDGE_LANGUAGE_IDS` can override them. The application submits isolated batches and polls their tokens. Configure Judge0 itself with process isolation, network restrictions, output limits, and language allowlists.
