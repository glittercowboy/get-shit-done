#!/usr/bin/env node
/**
 * GSD Research Cache CLI
 *
 * Store and retrieve research findings across projects.
 * Cache location: ~/.claude/cache/research/
 *
 * Commands:
 *   query   - Find cached research matching topic/technologies/tags
 *   save    - Save research to cache
 *   list    - List all cache entries
 *   clear   - Clear expired or all entries
 *   stats   - Show cache statistics
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// Cache configuration
const homeDir = os.homedir();
const cacheDir = path.join(homeDir, '.claude', 'cache', 'research');
const indexFile = path.join(cacheDir, 'index.json');
const entriesDir = path.join(cacheDir, 'entries');

// TTL by confidence level (in seconds)
const TTL = {
  HIGH: 90 * 24 * 60 * 60,   // 90 days
  MEDIUM: 30 * 24 * 60 * 60, // 30 days
  LOW: 7 * 24 * 60 * 60      // 7 days
};

// Ensure cache directories exist
function ensureCacheDir() {
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  if (!fs.existsSync(entriesDir)) {
    fs.mkdirSync(entriesDir, { recursive: true });
  }
}

// Read index file
function readIndex() {
  if (!fs.existsSync(indexFile)) {
    return { entries: [], lastUpdated: 0 };
  }
  try {
    return JSON.parse(fs.readFileSync(indexFile, 'utf8'));
  } catch (e) {
    return { entries: [], lastUpdated: 0 };
  }
}

// Write index file
function writeIndex(index) {
  index.lastUpdated = Math.floor(Date.now() / 1000);
  fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));
}

// Read entry file
function readEntry(id) {
  const entryFile = path.join(entriesDir, `${id}.json`);
  if (!fs.existsSync(entryFile)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(entryFile, 'utf8'));
  } catch (e) {
    return null;
  }
}

// Write entry file
function writeEntry(entry) {
  const entryFile = path.join(entriesDir, `${entry.id}.json`);
  fs.writeFileSync(entryFile, JSON.stringify(entry, null, 2));
}

// Delete entry file
function deleteEntry(id) {
  const entryFile = path.join(entriesDir, `${id}.json`);
  if (fs.existsSync(entryFile)) {
    fs.unlinkSync(entryFile);
  }
}

// Generate entry ID from topic and technologies
function generateId(topic, technologies) {
  const content = `${topic.toLowerCase()}:${technologies.sort().join(',')}`;
  return crypto.createHash('md5').update(content).digest('hex').substring(0, 12);
}

// Normalize technologies (lowercase, handle aliases)
function normalizeTechnologies(techs) {
  const aliases = {
    'r3f': 'react-three-fiber',
    '@react-three/fiber': 'react-three-fiber',
    'three': 'three.js',
    'threejs': 'three.js',
    'rapierjs': 'rapier',
    '@dimforge/rapier3d': 'rapier'
  };

  return techs.map(t => {
    const lower = t.toLowerCase().trim();
    return aliases[lower] || lower;
  }).filter(t => t.length > 0);
}

// Calculate match score between query and entry
function calculateScore(query, entry, now) {
  let score = 0;

  // Exact topic match: 100 points
  if (entry.topic.toLowerCase().includes(query.topic.toLowerCase()) ||
      query.topic.toLowerCase().includes(entry.topic.toLowerCase())) {
    score += 100;
  }

  // Each technology match: 20 points
  const queryTechs = normalizeTechnologies(query.technologies || []);
  const entryTechs = normalizeTechnologies(entry.technologies || []);
  for (const tech of queryTechs) {
    if (entryTechs.includes(tech)) {
      score += 20;
    }
  }

  // Each tag match: 5 points
  const queryTags = (query.tags || []).map(t => t.toLowerCase());
  const entryTags = (entry.tags || []).map(t => t.toLowerCase());
  for (const tag of queryTags) {
    if (entryTags.includes(tag)) {
      score += 5;
    }
  }

  // Recency bonus (accessed <7d): 10 points
  const lastAccessed = entry.lastAccessed || entry.created;
  const sevenDaysAgo = now - (7 * 24 * 60 * 60);
  if (lastAccessed > sevenDaysAgo) {
    score += 10;
  }

  // Confidence bonus: HIGH=10, MEDIUM=5, LOW=0
  if (entry.confidence === 'HIGH') score += 10;
  else if (entry.confidence === 'MEDIUM') score += 5;

  return score;
}

// Check if entry is expired
function isExpired(entry, now) {
  return entry.expires < now;
}

// Parse command-line arguments
function parseArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.substring(2);
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('--')) {
        result[key] = nextArg;
        i++;
      } else {
        result[key] = true;
      }
    }
  }
  return result;
}

// Parse RESEARCH.md file to extract structured content
function parseResearchFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const result = {
    summary: '',
    stack: [],
    patterns: [],
    pitfalls: [],
    dontHandRoll: [],
    sources: []
  };

  // Extract Summary section
  const summaryMatch = content.match(/## Summary\n\n([\s\S]*?)(?=\n## |$)/);
  if (summaryMatch) {
    result.summary = summaryMatch[1].trim().substring(0, 2000); // Limit size
  }

  // Extract Standard Stack section - get library names
  const stackMatch = content.match(/## Standard Stack[\s\S]*?\n\|.*?\|.*?\|.*?\|([\s\S]*?)(?=\n## |$)/);
  if (stackMatch) {
    const tableRows = stackMatch[1].match(/^\|[^|]+\|/gm);
    if (tableRows) {
      result.stack = tableRows.map(row => row.replace(/^\|/, '').replace(/\|$/, '').trim())
        .filter(name => name && !name.startsWith('-'));
    }
  }

  // Extract Architecture Patterns - get pattern names
  const patternsSection = content.match(/## Architecture Patterns([\s\S]*?)(?=\n## |$)/);
  if (patternsSection) {
    const patternNames = patternsSection[1].match(/### Pattern \d+: ([^\n]+)/g);
    if (patternNames) {
      result.patterns = patternNames.map(p => p.replace(/### Pattern \d+: /, ''));
    }
  }

  // Extract Don't Hand-Roll items
  const dontHandRollMatch = content.match(/## Don't Hand-Roll([\s\S]*?)(?=\n## |$)/);
  if (dontHandRollMatch) {
    const items = dontHandRollMatch[1].match(/^\| ([^|]+) \|/gm);
    if (items) {
      result.dontHandRoll = items
        .map(item => item.replace(/^\| /, '').replace(/ \|$/, '').trim())
        .filter(item => item && !item.startsWith('-') && item !== 'Problem');
    }
  }

  // Extract Common Pitfalls
  const pitfallsSection = content.match(/## Common Pitfalls([\s\S]*?)(?=\n## |$)/);
  if (pitfallsSection) {
    const pitfallNames = pitfallsSection[1].match(/### Pitfall \d+: ([^\n]+)/g);
    if (pitfallNames) {
      result.pitfalls = pitfallNames.map(p => p.replace(/### Pitfall \d+: /, ''));
    }
  }

  // Extract Sources (URLs)
  const sourcesSection = content.match(/## Sources([\s\S]*?)(?=\n## |$)/);
  if (sourcesSection) {
    const urls = sourcesSection[1].match(/https?:\/\/[^\s\)]+/g);
    if (urls) {
      result.sources = [...new Set(urls)].slice(0, 10); // Dedupe, limit to 10
    }
  }

  return result;
}

// QUERY command
function cmdQuery(args) {
  const opts = parseArgs(args);
  const topic = opts.topic || '';
  const technologies = (opts.technologies || '').split(',').filter(t => t);
  const tags = (opts.tags || '').split(',').filter(t => t);

  if (!topic && technologies.length === 0 && tags.length === 0) {
    console.log(JSON.stringify({ hits: [], error: 'No search criteria provided' }));
    return;
  }

  ensureCacheDir();
  const index = readIndex();
  const now = Math.floor(Date.now() / 1000);
  const query = { topic, technologies, tags };

  // Score and filter entries
  const hits = [];
  for (const entryMeta of index.entries) {
    // Skip expired entries
    if (isExpired(entryMeta, now)) continue;

    const score = calculateScore(query, entryMeta, now);
    if (score >= 30) {
      const entry = readEntry(entryMeta.id);
      if (entry) {
        // Update last accessed time
        entry.lastAccessed = now;
        writeEntry(entry);

        hits.push({
          id: entry.id,
          topic: entry.topic,
          technologies: entry.technologies,
          tags: entry.tags,
          confidence: entry.confidence,
          score,
          created: entry.created,
          expires: entry.expires,
          content: entry.content
        });
      }
    }
  }

  // Sort by score descending
  hits.sort((a, b) => b.score - a.score);

  console.log(JSON.stringify({ hits }));
}

// SAVE command
function cmdSave(args) {
  const opts = parseArgs(args);
  const topic = opts.topic;
  const technologies = normalizeTechnologies((opts.technologies || '').split(','));
  const tags = (opts.tags || '').split(',').filter(t => t.trim()).map(t => t.toLowerCase().trim());
  const confidence = (opts.confidence || 'MEDIUM').toUpperCase();
  const sourceFile = opts['source-file'];

  if (!topic) {
    console.log(JSON.stringify({ success: false, error: 'Topic required' }));
    return;
  }

  if (!['HIGH', 'MEDIUM', 'LOW'].includes(confidence)) {
    console.log(JSON.stringify({ success: false, error: 'Invalid confidence level' }));
    return;
  }

  // Parse content from source file or stdin
  let content;
  if (sourceFile) {
    try {
      content = parseResearchFile(sourceFile);
    } catch (e) {
      console.log(JSON.stringify({ success: false, error: e.message }));
      return;
    }
  } else if (opts.stdin) {
    // Read from stdin (for testing)
    try {
      const stdinData = fs.readFileSync(0, 'utf8');
      content = JSON.parse(stdinData);
    } catch (e) {
      console.log(JSON.stringify({ success: false, error: 'Failed to parse stdin JSON' }));
      return;
    }
  } else {
    console.log(JSON.stringify({ success: false, error: 'source-file or --stdin required' }));
    return;
  }

  ensureCacheDir();
  const now = Math.floor(Date.now() / 1000);
  const ttl = TTL[confidence] || TTL.MEDIUM;
  const id = generateId(topic, technologies);

  const entry = {
    id,
    created: now,
    expires: now + ttl,
    lastAccessed: now,
    topic,
    technologies,
    tags,
    confidence,
    content,
    sources: content.sources || []
  };

  // Write entry
  writeEntry(entry);

  // Update index
  const index = readIndex();
  const existingIdx = index.entries.findIndex(e => e.id === id);
  const indexEntry = {
    id,
    topic,
    technologies,
    tags,
    confidence,
    created: now,
    expires: now + ttl
  };

  if (existingIdx >= 0) {
    index.entries[existingIdx] = indexEntry;
  } else {
    index.entries.push(indexEntry);
  }

  writeIndex(index);

  console.log(JSON.stringify({
    success: true,
    id,
    expires: new Date((now + ttl) * 1000).toISOString().split('T')[0]
  }));
}

// LIST command
function cmdList(args) {
  ensureCacheDir();
  const index = readIndex();
  const now = Math.floor(Date.now() / 1000);

  const entries = index.entries.map(e => ({
    id: e.id,
    topic: e.topic,
    technologies: e.technologies,
    tags: e.tags,
    confidence: e.confidence,
    created: new Date(e.created * 1000).toISOString().split('T')[0],
    expires: new Date(e.expires * 1000).toISOString().split('T')[0],
    expired: isExpired(e, now)
  }));

  // Sort by created descending
  entries.sort((a, b) => new Date(b.created) - new Date(a.created));

  console.log(JSON.stringify({ entries, total: entries.length }));
}

// CLEAR command
function cmdClear(args) {
  const opts = parseArgs(args);
  ensureCacheDir();
  const index = readIndex();
  const now = Math.floor(Date.now() / 1000);

  let removed = 0;

  if (opts.all) {
    // Clear all entries
    for (const entry of index.entries) {
      deleteEntry(entry.id);
      removed++;
    }
    index.entries = [];
  } else if (opts.expired) {
    // Clear only expired entries
    const remaining = [];
    for (const entry of index.entries) {
      if (isExpired(entry, now)) {
        deleteEntry(entry.id);
        removed++;
      } else {
        remaining.push(entry);
      }
    }
    index.entries = remaining;
  } else if (opts.id) {
    // Clear specific entry by ID
    const idx = index.entries.findIndex(e => e.id === opts.id);
    if (idx >= 0) {
      deleteEntry(opts.id);
      index.entries.splice(idx, 1);
      removed = 1;
    }
  } else {
    console.log(JSON.stringify({ success: false, error: 'Specify --expired, --all, or --id' }));
    return;
  }

  writeIndex(index);
  console.log(JSON.stringify({ success: true, removed }));
}

// STATS command
function cmdStats(args) {
  ensureCacheDir();
  const index = readIndex();
  const now = Math.floor(Date.now() / 1000);

  let totalSize = 0;
  let expired = 0;
  const byConfidence = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  const techCounts = {};
  const tagCounts = {};

  for (const entry of index.entries) {
    // Count by confidence
    byConfidence[entry.confidence] = (byConfidence[entry.confidence] || 0) + 1;

    // Count expired
    if (isExpired(entry, now)) expired++;

    // Count technologies
    for (const tech of entry.technologies || []) {
      techCounts[tech] = (techCounts[tech] || 0) + 1;
    }

    // Count tags
    for (const tag of entry.tags || []) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }

    // Calculate size
    const entryFile = path.join(entriesDir, `${entry.id}.json`);
    if (fs.existsSync(entryFile)) {
      totalSize += fs.statSync(entryFile).size;
    }
  }

  // Sort and limit top items
  const topTechnologies = Object.entries(techCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  console.log(JSON.stringify({
    total: index.entries.length,
    expired,
    active: index.entries.length - expired,
    byConfidence,
    topTechnologies,
    topTags,
    sizeBytes: totalSize,
    sizeKB: Math.round(totalSize / 1024),
    lastUpdated: index.lastUpdated ? new Date(index.lastUpdated * 1000).toISOString() : null
  }));
}

// Main
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'query':
    cmdQuery(args.slice(1));
    break;
  case 'save':
    cmdSave(args.slice(1));
    break;
  case 'list':
    cmdList(args.slice(1));
    break;
  case 'clear':
    cmdClear(args.slice(1));
    break;
  case 'stats':
    cmdStats(args.slice(1));
    break;
  default:
    console.log(JSON.stringify({
      error: 'Unknown command',
      usage: 'gsd-research-cache.js <query|save|list|clear|stats> [options]'
    }));
    process.exit(1);
}
