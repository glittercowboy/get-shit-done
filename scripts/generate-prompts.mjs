// scripts/generate-prompts.mjs
// Generates .github/prompts/*.prompt.md from upstream commands/gsd/*.md
// No external deps. Minimal YAML frontmatter parsing.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const COMMANDS_DIR = path.join(ROOT, 'commands', 'gsd');
const OUT_DIR = path.join(ROOT, '.github', 'prompts');

function readFile(p) {
  return fs.readFileSync(p, 'utf8');
}

function writeFile(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, 'utf8');
}

function listMarkdownFiles(dir) {
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md') && !f.endsWith('.bak'))
    .map(f => path.join(dir, f));
}

// extremely small frontmatter parser: expects leading --- block
function parseFrontmatter(md) {
  if (!md.startsWith('---')) return { data: {}, body: md };
  const end = md.indexOf('\n---', 3);
  if (end === -1) return { data: {}, body: md };
  const fm = md.slice(3, end).trim();
  const body = md.slice(end + '\n---'.length).trimStart();
  const data = {};
  for (const line of fm.split('\n')) {
    const m = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)\s*$/);
    if (!m) continue;
    let [, k, v] = m;
    v = v.replace(/^["']|["']$/g, '');
    data[k] = v;
  }
  return { data, body };
}

function normalizeName(name) {
  // upstream uses gsd:new-project; VS Code prompt uses gsd.new-project
  return name.replace(/^gsd:/, 'gsd.').replace(/:/g, '.');
}

function convertIncludes(text) {
  // Convert Claude-style @ includes into Copilot-friendly "Read file at" bullets
  return text
    .replace(/^\s*@\s*(.+)$/gm, (m, p1) => `- Read file at: ${p1.trim()}`)
    .replace(/@~\/\.claude\/get-shit-done\//g, ''); // strip runtime path hints
}

function normalizeClaudePathsForLocalInstall(text) {
  // Convert global install paths to workspace-local install paths
  return text.replace(/~\/\.claude\//g, './.claude/');
}

function buildPrompt({ cmdFile, fm, body }) {
  const upstreamName = fm.name || '';
  const cmdName = upstreamName ? normalizeName(upstreamName) : ('gsd.' + path.basename(cmdFile, '.md'));

  const description = fm.description || `GSD command ${cmdName}`;
  const argumentHint = fm['argument-hint'] || '';

  const converted = normalizeClaudePathsForLocalInstall(convertIncludes(body));

  return `---
name: ${cmdName}
description: "${description.replace(/"/g, '\\"')}"
argument-hint: "${argumentHint.replace(/"/g, '\\"')}"
agent: agent
---

${converted}
`;
}

function main() {
  const files = listMarkdownFiles(COMMANDS_DIR);
  if (!files.length) {
    console.error(`No command files found at ${COMMANDS_DIR}`);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const f of files) {
    const md = readFile(f);
    const { data, body } = parseFrontmatter(md);

    const prompt = buildPrompt({ cmdFile: f, fm: data, body });
    const base = path.basename(f, '.md');          // e.g., new-project
    const outName = `gsd.${base}.prompt.md`;       // e.g., gsd.new-project.prompt.md
    const outPath = path.join(OUT_DIR, outName);

    writeFile(outPath, prompt);
  }

  console.log(`Generated ${files.length} prompt files into ${OUT_DIR}`);
}

main();
