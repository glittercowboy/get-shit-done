#!/usr/bin/env node
// Claude Code Statusline - GSD Edition
// Row 1: model | dir | git branch+status | context bar
// Row 2: GSD quota routing data (tokens, model mix, savings)

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const DIM = '\x1b[2m', RESET = '\x1b[0m', CYAN = '\x1b[36m';
const GREEN = '\x1b[32m', YELLOW = '\x1b[33m', ORANGE = '\x1b[38;5;208m', RED = '\x1b[31m';

// Parse unprocessed assistant turns from a JSONL file, starting at a line offset.
// Returns { entries, newLineCount } where newLineCount is the updated position.
function processJsonlFrom(filePath, fromLine) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split('\n');
  const entries = [];
  for (let i = fromLine; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      const r = JSON.parse(line);
      if (r.type === 'assistant' && r.message && r.message.usage) {
        const u = r.message.usage;
        const modelId = r.message.model || '';
        const model = modelId.includes('opus') ? 'opus'
          : modelId.includes('haiku') ? 'haiku'
          : 'sonnet';
        // Store cache token types separately — they have different rates:
        // cache_create_1h: 2x input, cache_create_5m: 1.25x input, cache_read: 0.1x input
        const cc = u.cache_creation || {};
        entries.push({
          model,
          tokens_in: u.input_tokens || 0,
          tokens_cache_create_1h: cc.ephemeral_1h_input_tokens || 0,
          tokens_cache_create_5m: (u.cache_creation_input_tokens || 0)
            - (cc.ephemeral_1h_input_tokens || 0),
          tokens_cache_read: u.cache_read_input_tokens || 0,
          tokens_out: u.output_tokens || 0,
          timestamp: r.timestamp || new Date().toISOString()
        });
      }
    } catch (_) {}
  }
  return { entries, newLineCount: lines.length };
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const model = data.model?.display_name || 'Claude';
    const cwd = data.workspace?.current_dir || process.cwd();
    const dir = path.basename(cwd);
    const homeDir = os.homedir();
    const cacheDir = path.join(homeDir, '.claude', 'cache');

    // --- Context bar ---
    const pct = Math.floor(data.context_window?.used_percentage || 0);
    const filled = Math.floor(pct / 10);
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
    const barColor = pct >= 90 ? RED : pct >= 70 ? ORANGE : pct >= 50 ? YELLOW : GREEN;
    const ctx = `${barColor}${bar} ${pct}%${RESET}`;

    // --- Auto-record quota from JSONL (main + subagents) ---
    // Uses line-count offsets per file so we only parse new lines each render.
    // Captures every turn including rapid tool-use sequences and subagent models.
    try {
      const transcriptPath = data.transcript_path;
      const sessionId = data.session_id;

      if (transcriptPath && sessionId && fs.existsSync(transcriptPath)) {
        const dedupFile = path.join(cacheDir, 'gsd-quota-dedup.json');
        let dedup = {};
        try { dedup = JSON.parse(fs.readFileSync(dedupFile, 'utf8')); } catch (_) {}

        // Main session JSONL
        const mainKey = 'main:' + sessionId;
        const mainResult = processJsonlFrom(transcriptPath, dedup[mainKey] || 0);

        // Subagent JSONLs (sibling dir: transcript without .jsonl extension)
        const subagentDir = transcriptPath.slice(0, -'.jsonl'.length) + '/subagents';
        const subResults = [];
        if (fs.existsSync(subagentDir)) {
          for (const f of fs.readdirSync(subagentDir)) {
            if (!f.endsWith('.jsonl')) continue;
            const subKey = 'sub:' + sessionId + ':' + f;
            const result = processJsonlFrom(path.join(subagentDir, f), dedup[subKey] || 0);
            subResults.push({ key: subKey, ...result });
          }
        }

        const allNew = [
          ...mainResult.entries,
          ...subResults.flatMap(r => r.entries)
        ];

        if (allNew.length > 0) {
          // Load quota state
          const quotaStatePath = path.join(cwd, '.planning', 'quota', 'session-usage.json');
          const DEFAULT_STATE = {
            tasks: [],
            session: { tokens_used: 0, tokens_limit: 2000000, last_updated: null, reset_time: null },
            weekly: { tokens_used: 0, tokens_limit: 100000000, last_updated: null, reset_time: null },
            warnings_shown: { session_80: false, weekly_80: false }
          };
          let state = DEFAULT_STATE;
          try {
            if (fs.existsSync(quotaStatePath)) {
              state = { ...DEFAULT_STATE, ...JSON.parse(fs.readFileSync(quotaStatePath, 'utf8')) };
            }
          } catch (_) {}

          state.tasks = state.tasks || [];
          let turnTotal = 0;
          for (const e of allNew) {
            state.tasks.push({
              task_id: sessionId + '-' + e.timestamp,
              model: e.model,
              tokens_in:              e.tokens_in,
              tokens_cache_create_1h: e.tokens_cache_create_1h,
              tokens_cache_create_5m: e.tokens_cache_create_5m,
              tokens_cache_read:      e.tokens_cache_read,
              tokens_out:             e.tokens_out,
              timestamp: e.timestamp
            });
            turnTotal += e.tokens_in + (e.tokens_cache_create_1h || 0)
              + (e.tokens_cache_create_5m || 0) + (e.tokens_cache_read || 0)
              + e.tokens_out;
          }

          state.session.tokens_used = (state.session.tokens_used || 0) + turnTotal;
          state.session.last_updated = new Date().toISOString();
          state.weekly.tokens_used = (state.weekly.tokens_used || 0) + turnTotal;
          state.weekly.last_updated = new Date().toISOString();

          // Prune records older than 48h (display window is 24h, keep 2x as buffer)
          const cutoff48h = Date.now() - 48 * 60 * 60 * 1000;
          state.tasks = state.tasks.filter(t => {
            const ts = t.timestamp ? new Date(t.timestamp).getTime() : Date.now();
            return ts >= cutoff48h;
          });

          fs.mkdirSync(path.dirname(quotaStatePath), { recursive: true });
          fs.writeFileSync(quotaStatePath, JSON.stringify(state, null, 2));

          // Invalidate quota display cache so row2 updates immediately
          try { fs.unlinkSync(path.join(cacheDir, 'gsd-statusline-quota.json')); } catch (_) {}
        }

        // Update dedup line offsets (always, even if no new entries)
        dedup[mainKey] = mainResult.newLineCount;
        for (const r of subResults) dedup[r.key] = r.newLineCount;

        // Trim dedup to last 200 keys
        const dkeys = Object.keys(dedup);
        if (dkeys.length > 200) {
          for (const k of dkeys.slice(0, dkeys.length - 200)) delete dedup[k];
        }
        fs.mkdirSync(cacheDir, { recursive: true });
        fs.writeFileSync(dedupFile, JSON.stringify(dedup));
      }
    } catch (_) {}

    // --- Git info (cached 5s per cwd) ---
    let gitPart = '';
    try {
      const gitCacheFile = path.join(cacheDir, 'gsd-statusline-git.json');
      let gitInfo = null;
      if (fs.existsSync(gitCacheFile)) {
        const raw = JSON.parse(fs.readFileSync(gitCacheFile, 'utf8'));
        const age = (Date.now() - (raw.ts || 0)) / 1000;
        if (age < 5 && raw.cwd === cwd) gitInfo = raw;
      }
      if (!gitInfo) {
        execSync('git rev-parse --git-dir', { stdio: 'ignore', cwd });
        const branch = execSync('git branch --show-current', { encoding: 'utf8', cwd }).trim();
        const staged = execSync('git diff --cached --numstat', { encoding: 'utf8', cwd })
          .trim().split('\n').filter(Boolean).length;
        gitInfo = { branch, staged, cwd, ts: Date.now() };
        fs.mkdirSync(cacheDir, { recursive: true });
        fs.writeFileSync(gitCacheFile, JSON.stringify(gitInfo));
      }
      if (gitInfo.branch) {
        gitPart = ` │ ${CYAN}${gitInfo.branch}${RESET}`;
        if (gitInfo.staged) gitPart += ` ${GREEN}+${gitInfo.staged}${RESET}`;
      }
    } catch (e) {}

    // --- Row 1 ---
    const row1 = `${DIM}${model}${RESET} │ ${DIM}${dir}${RESET}${gitPart} │ ${ctx}`;

    // --- GSD quota data (cached 10s) ---
    let row2 = '';
    try {
      const quotaCacheFile = path.join(cacheDir, 'gsd-statusline-quota.json');
      let quotaInfo = null;
      if (fs.existsSync(quotaCacheFile)) {
        const raw = JSON.parse(fs.readFileSync(quotaCacheFile, 'utf8'));
        const age = (Date.now() - (raw.ts || 0)) / 1000;
        if (age < 10) quotaInfo = raw;
      }
      if (!quotaInfo) {
        const gsdTools = path.join(homeDir, '.claude', 'get-shit-done', 'bin', 'gsd-tools.js');
        if (fs.existsSync(gsdTools)) {
          const result = execSync(`"${process.execPath}" "${gsdTools}" quota status-bar`, { encoding: 'utf8' }).trim();
          const parsed = JSON.parse(result);
          quotaInfo = { bar: parsed.status_bar || '', ts: Date.now() };
          fs.mkdirSync(cacheDir, { recursive: true });
          fs.writeFileSync(quotaCacheFile, JSON.stringify(quotaInfo));
        }
      }
      row2 = quotaInfo?.bar || '';
    } catch (e) {}

    // --- Output ---
    if (row2) {
      process.stdout.write(row1 + '\n' + row2 + '\n');
    } else {
      process.stdout.write(row1 + '\n');
    }
  } catch (e) {
    // Silent fail - don't break statusline
  }
});
