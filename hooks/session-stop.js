#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const session = require('./gsd-session.js');

function main() {
  const sessionId = process.env.GSD_SESSION_ID;
  if (!sessionId) process.exit(0);

  const projectDir = session.resolveProjectDir();
  const planningDir = path.join(projectDir, '.planning');
  if (!fs.existsSync(planningDir)) process.exit(0);

  const filePath = session.sessionsFilePath(projectDir);
  if (!fs.existsSync(filePath)) process.exit(0);

  const current = session.readSessions(filePath);
  const next = { sessions: current.sessions.filter(s => String(s.id) !== String(sessionId)) };
  session.writeSessions(filePath, next);
}

if (require.main === module) main();

