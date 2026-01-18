#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const session = require('./gsd-session.js');

function main() {
  const projectDir = session.resolveProjectDir();
  const planningDir = path.join(projectDir, '.planning');
  if (!fs.existsSync(planningDir)) process.exit(0);

  // Ensure file exists + prune stale
  const filePath = session.sessionsFilePath(projectDir);
  session.writeSessions(filePath, session.readSessions(filePath));

  // Prune stale sessions using the same defaults as execute-phase
  // (Call CLI logic via spawn-free reimplementation)
  const ttlSeconds = 14400;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const current = session.readSessions(filePath);
  const pruned = current.sessions.filter(s => {
    const ms = Date.parse(s.started);
    if (Number.isNaN(ms)) return false;
    return nowSeconds - Math.floor(ms / 1000) < ttlSeconds;
  });
  session.writeSessions(filePath, { sessions: pruned });

  if (pruned.length === 0) process.exit(0);

  // Minimal warning only when sessions exist.
  // eslint-disable-next-line no-console
  console.log(`\n⚠ GSD: Active sessions detected (${pruned.length})`);
  for (const s of pruned.slice(0, 5)) {
    // eslint-disable-next-line no-console
    console.log(`- ${s.id} (phase ${s.phase}) last: ${s.last_activity}`);
  }
  if (pruned.length > 5) {
    // eslint-disable-next-line no-console
    console.log(`- …and ${pruned.length - 5} more`);
  }
  // eslint-disable-next-line no-console
  console.log('');
}

if (require.main === module) main();

