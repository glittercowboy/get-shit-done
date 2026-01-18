#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function toIsoSeconds(date) {
  // Claude docs/examples use second precision.
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }
    const [rawKey, inlineValue] = token.split('=', 2);
    const key = rawKey.slice(2);
    if (inlineValue !== undefined) {
      args[key] = inlineValue;
      continue;
    }
    const next = argv[i + 1];
    if (next == null || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i++;
  }
  return args;
}

function findProjectDir(startDir) {
  let dir = startDir;
  for (let i = 0; i < 20; i++) {
    if (fs.existsSync(path.join(dir, '.planning'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return startDir;
}

function resolveProjectDir(argProjectDir) {
  const fromArg = argProjectDir ? path.resolve(String(argProjectDir)) : null;
  const fromEnv =
    process.env.CLAUDE_PROJECT_DIR ||
    process.env.GSD_PROJECT_DIR ||
    process.env.INIT_CWD ||
    null;

  if (fromArg) return findProjectDir(fromArg);
  if (fromEnv) return findProjectDir(path.resolve(fromEnv));
  return findProjectDir(process.cwd());
}

function sessionsFilePath(projectDir) {
  return path.join(projectDir, '.planning', 'ACTIVE-SESSIONS.json');
}

function readSessions(filePath) {
  if (!fs.existsSync(filePath)) return { sessions: [] };
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { sessions: [] };
    if (!Array.isArray(parsed.sessions)) return { sessions: [] };
    return { sessions: parsed.sessions };
  } catch {
    // Be conservative: treat as empty instead of crashing execution.
    return { sessions: [] };
  }
}

function writeSessions(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    // If the project hasn't been initialized, do nothing.
    return false;
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  return true;
}

function parseUnixSecondsFromIso(iso) {
  if (typeof iso !== 'string' || iso.length === 0) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / 1000);
}

function pruneStaleSessions(sessions, nowSeconds, ttlSeconds) {
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) return sessions;
  return sessions.filter(s => {
    const startedSeconds = parseUnixSecondsFromIso(s.started);
    if (startedSeconds == null) return false;
    return nowSeconds - startedSeconds < ttlSeconds;
  });
}

function usage(exitCode = 0) {
  const text = `
Usage: gsd-session <command> [options]

Commands:
  init                 Ensure sessions file exists; prune stale entries
  list                 List sessions (optionally filter by --phase)
  register             Register a new session for --phase (prints session id)
  heartbeat            Update last_activity for --id
  cleanup              Remove session by --id
  claim                Remove sessions by --id or --phase

Options:
  --project-dir <dir>  Override project directory (defaults to CLAUDE_PROJECT_DIR or cwd)
  --phase <phase>      Phase identifier (e.g., 03 or 02.1)
  --id <session-id>    Session id to update/remove
  --ttl-seconds <n>    Stale TTL for init pruning (default: 14400)
  --format <json|lines> Output format for list (default: json)
`.trim();
  // eslint-disable-next-line no-console
  console.log(text);
  process.exit(exitCode);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];

  if (!command || args.help) usage(0);

  const projectDir = resolveProjectDir(args['project-dir']);
  const filePath = sessionsFilePath(projectDir);

  if (command === 'init') {
    const ttlSeconds = Number(args['ttl-seconds'] ?? 14400);
    if (!fs.existsSync(path.dirname(filePath))) process.exit(0);

    const nowSeconds = Math.floor(Date.now() / 1000);
    const current = readSessions(filePath);
    const pruned = pruneStaleSessions(current.sessions, nowSeconds, ttlSeconds);
    const next = { sessions: pruned };
    writeSessions(filePath, next);
    process.exit(0);
  }

  if (command === 'list') {
    const phase = args.phase != null ? String(args.phase) : null;
    const format = String(args.format || 'json');

    const current = readSessions(filePath);
    const sessions = phase
      ? current.sessions.filter(s => String(s.phase) === phase)
      : current.sessions;

    if (format === 'lines') {
      for (const s of sessions) {
        // eslint-disable-next-line no-console
        console.log(
          [s.id, s.phase, s.started, s.last_activity, s.status].map(v => String(v ?? '')).join('\t')
        );
      }
      process.exit(0);
    }

    // eslint-disable-next-line no-console
    console.log(JSON.stringify(sessions, null, 2));
    process.exit(0);
  }

  if (command === 'register') {
    const phase = args.phase != null ? String(args.phase) : null;
    if (!phase) {
      // eslint-disable-next-line no-console
      console.error('ERROR: register requires --phase');
      process.exit(2);
    }
    if (!fs.existsSync(path.dirname(filePath))) process.exit(0);

    const now = toIsoSeconds(new Date());
    const sessionId = `${phase}-${Math.floor(Date.now() / 1000)}`;

    const current = readSessions(filePath);
    const next = {
      sessions: [
        ...current.sessions,
        {
          id: sessionId,
          phase,
          started: now,
          last_activity: now,
          status: 'executing',
        },
      ],
    };
    writeSessions(filePath, next);
    // eslint-disable-next-line no-console
    console.log(sessionId);
    process.exit(0);
  }

  if (command === 'heartbeat') {
    const id = args.id != null ? String(args.id) : null;
    if (!id) {
      // eslint-disable-next-line no-console
      console.error('ERROR: heartbeat requires --id');
      process.exit(2);
    }
    if (!fs.existsSync(filePath)) process.exit(0);

    const now = toIsoSeconds(new Date());
    const current = readSessions(filePath);
    let found = false;
    const next = {
      sessions: current.sessions.map(s => {
        if (String(s.id) !== id) return s;
        found = true;
        return { ...s, last_activity: now };
      }),
    };
    if (found) writeSessions(filePath, next);
    process.exit(found ? 0 : 1);
  }

  if (command === 'cleanup') {
    const id = args.id != null ? String(args.id) : null;
    if (!id) {
      // eslint-disable-next-line no-console
      console.error('ERROR: cleanup requires --id');
      process.exit(2);
    }
    if (!fs.existsSync(filePath)) process.exit(0);

    const current = readSessions(filePath);
    const next = { sessions: current.sessions.filter(s => String(s.id) !== id) };
    writeSessions(filePath, next);
    process.exit(0);
  }

  if (command === 'claim') {
    const id = args.id != null ? String(args.id) : null;
    const phase = args.phase != null ? String(args.phase) : null;
    if (!id && !phase) {
      // eslint-disable-next-line no-console
      console.error('ERROR: claim requires --id or --phase');
      process.exit(2);
    }
    if (!fs.existsSync(filePath)) process.exit(0);

    const current = readSessions(filePath);
    const next = {
      sessions: current.sessions.filter(s => {
        if (id && String(s.id) === id) return false;
        if (phase && String(s.phase) === phase) return false;
        return true;
      }),
    };
    writeSessions(filePath, next);
    process.exit(0);
  }

  usage(2);
}

if (require.main === module) main();

module.exports = {
  resolveProjectDir,
  sessionsFilePath,
  readSessions,
  writeSessions,
};

