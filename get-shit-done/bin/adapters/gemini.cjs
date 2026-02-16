'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CLI_NAME = 'gemini';

function classifyError(err) {
  if (err.signal === 'SIGTERM') return 'TIMEOUT';
  if (err.code === 'ENOENT' || err.status === 127) return 'NOT_FOUND';
  if (err.status === 126) return 'PERMISSION';
  return 'EXIT_ERROR';
}

function sanitizeEnv(env) {
  const clean = { ...env };
  delete clean.DEBUG;
  return clean;
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

    let cmd = `cat "${tmpFile}" | gemini -p --output-format json`;
    if (model) {
      cmd += ` -m "${model}"`;
    }

    const stdout = execSync(cmd, {
      timeout,
      stdio: 'pipe',
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
      env: sanitizeEnv(process.env),
    });

    const duration = Date.now() - start;

    let text;
    try {
      const parsed = JSON.parse(stdout);
      text = parsed.response || stdout.trim();
    } catch (_) {
      text = stdout.trim();
    }

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
