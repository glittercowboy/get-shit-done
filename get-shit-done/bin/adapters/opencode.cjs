'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CLI_NAME = 'opencode';

function classifyError(err) {
  if (err.signal === 'SIGTERM') return 'TIMEOUT';
  if (err.code === 'ENOENT' || err.status === 127) return 'NOT_FOUND';
  if (err.status === 126) return 'PERMISSION';
  return 'EXIT_ERROR';
}

function extractOpenCodeResponse(stdout) {
  try {
    const parsed = JSON.parse(stdout);
    if (typeof parsed === 'string') return parsed;
    if (parsed.response) return parsed.response;
    if (parsed.text) return parsed.text;
    return stdout.trim();
  } catch (_) {
    return stdout.trim();
  }
}

function detect() {
  try {
    const stdout = execSync(`${CLI_NAME} --version`, {
      timeout: 10000,
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    return { available: true, version: stdout.trim(), error: null };
  } catch (err) {
    return { available: false, version: null, error: classifyError(err) };
  }
}

function invoke(prompt, options) {
  const timeout = (options && options.timeout) || 120000;
  const model = options && options.model;
  const tmpFile = path.join(os.tmpdir(), `gsd-${CLI_NAME}-${Date.now()}.txt`);
  const start = Date.now();

  try {
    fs.writeFileSync(tmpFile, prompt, 'utf-8');

    let cmd = `cat "${tmpFile}" | opencode run --format json`;
    if (model) {
      cmd += ` -m "${model}"`;
    }

    const stdout = execSync(cmd, {
      timeout,
      stdio: 'pipe',
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });

    const duration = Date.now() - start;
    const text = extractOpenCodeResponse(stdout);

    return {
      text,
      cli: CLI_NAME,
      duration,
      exitCode: 0,
      error: null,
      errorType: null,
    };
  } catch (err) {
    const duration = Date.now() - start;
    // Only check exitCode for success/failure, NOT stderr content
    // OpenCode/Bun emits CPU warnings to stderr that are not errors
    return {
      text: null,
      cli: CLI_NAME,
      duration,
      exitCode: err.status || 1,
      error: err.message,
      errorType: classifyError(err),
    };
  } finally {
    try { fs.unlinkSync(tmpFile); } catch (_) { /* ignore cleanup errors */ }
  }
}

module.exports = { detect, invoke, CLI_NAME };
