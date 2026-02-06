#!/usr/bin/env node
// Update STATE.md Session Continuity before context compaction
// Called by PreCompact hook - ensures STATE.md reflects current state before compaction

const fs = require('fs');
const path = require('path');

// Read JSON from stdin (Claude Code passes hook context)
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const cwd = data.cwd || process.cwd();

    const statePath = path.join(cwd, '.planning', 'STATE.md');
    if (!fs.existsSync(statePath)) {
      process.exit(0); // Not a GSD project
    }

    let content = fs.readFileSync(statePath, 'utf8');

    // Extract current status from Current Position section
    let currentStatus = 'unknown';
    const statusMatch = content.match(/^Status:\s*(.+)$/m);
    if (statusMatch) {
      currentStatus = statusMatch[1].trim();
    }

    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');

    const newContinuity = `## Session Continuity

Last session: ${now}
Stopped at: Context compaction during "${currentStatus}"
Resume file: None`;

    // Replace existing Session Continuity section or append
    const sectionRegex = /## Session Continuity[\s\S]*$/;
    if (sectionRegex.test(content)) {
      content = content.replace(sectionRegex, newContinuity);
    } else {
      content = content.trimEnd() + '\n\n' + newContinuity + '\n';
    }

    fs.writeFileSync(statePath, content);
  } catch (e) {
    // Silent fail - don't block compaction
  }
});
