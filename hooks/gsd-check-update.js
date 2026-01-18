#!/usr/bin/env node
// Check for GSD updates in background, write result to cache
// Called by SessionStart hook - runs once per session

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Resolve Claude config directory from this hook's location:
// - Global install: {configDir}/hooks/gsd-check-update.js
// - Local install:  {project}/.claude/hooks/gsd-check-update.js
const claudeDir = path.resolve(__dirname, '..');
const cacheDir = path.join(claudeDir, 'cache');
const cacheFile = path.join(cacheDir, 'gsd-update-check.json');
const versionFile = path.join(claudeDir, 'get-shit-done', 'VERSION');

// Ensure cache directory exists
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

// Run check in background (spawn detached process)
const child = spawn(process.execPath, ['-e', `
  const fs = require('fs');
  const { execSync } = require('child_process');

  const cacheFile = ${JSON.stringify(cacheFile)};
  const versionFile = ${JSON.stringify(versionFile)};

  let installed = '0.0.0';
  try {
    installed = fs.readFileSync(versionFile, 'utf8').trim();
  } catch (e) {}

  let latest = null;
  try {
    latest = execSync('npm view get-shit-done-cc version', { encoding: 'utf8', timeout: 10000 }).trim();
  } catch (e) {}

  const result = {
    update_available: latest && installed !== latest,
    installed,
    latest: latest || 'unknown',
    checked: Math.floor(Date.now() / 1000)
  };

  fs.writeFileSync(cacheFile, JSON.stringify(result));
`], {
  detached: true,
  stdio: 'ignore'
});

child.unref();
