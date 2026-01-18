#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

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

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value; // 'object','string','number','boolean','undefined','function'
}

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function getByPath(obj, dotPath) {
  if (!dotPath) return { found: true, value: obj };
  const parts = String(dotPath).split('.').filter(Boolean);
  let current = obj;
  for (const part of parts) {
    if (!isPlainObject(current) && !Array.isArray(current)) return { found: false };
    if (current == null || !(part in current)) return { found: false };
    current = current[part];
  }
  return { found: true, value: current };
}

function setByPath(obj, dotPath, value) {
  const parts = String(dotPath).split('.').filter(Boolean);
  if (parts.length === 0) return value;
  const nextObj = isPlainObject(obj) ? { ...obj } : {};
  let current = nextObj;
  for (let i = 0; i < parts.length; i++) {
    const key = parts[i];
    const last = i === parts.length - 1;
    if (last) {
      current[key] = value;
      break;
    }
    const existing = current[key];
    const next = isPlainObject(existing) ? { ...existing } : {};
    current[key] = next;
    current = next;
  }
  return nextObj;
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function readJsonSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return { ok: false, code: 'missing', error: 'file not found' };
    return { ok: true, data: readJson(filePath) };
  } catch (error) {
    return { ok: false, code: 'invalid', error: error && error.message ? error.message : String(error) };
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function deepMergeDefaults(defaults, current) {
  if (isPlainObject(defaults) && isPlainObject(current)) {
    const result = {};
    const keys = new Set([...Object.keys(defaults), ...Object.keys(current)]);
    for (const key of keys) {
      if (key in current) {
        if (key in defaults) {
          result[key] = deepMergeDefaults(defaults[key], current[key]);
        } else {
          // Preserve unknown keys
          result[key] = current[key];
        }
      } else {
        result[key] = defaults[key];
      }
    }
    return result;
  }

  // Arrays and primitives: user value wins if provided (including null).
  if (current !== undefined) return current;
  return defaults;
}

function collectSchemaIssues(defaults, current, prefix = '') {
  const missing = [];
  const typeMismatches = [];

  if (!isPlainObject(defaults)) return { missing, typeMismatches };

  for (const key of Object.keys(defaults)) {
    const pathKey = prefix ? `${prefix}.${key}` : key;
    const defVal = defaults[key];

    if (!isPlainObject(current) || !(key in current)) {
      missing.push({ path: pathKey, defaultType: typeOf(defVal), defaultValue: defVal });
      continue;
    }

    const curVal = current[key];
    const defType = typeOf(defVal);
    const curType = typeOf(curVal);

    if (defType !== curType) {
      // Allow null override without flagging as mismatch (user intentionally nulls a field).
      if (curType !== 'null') {
        typeMismatches.push({ path: pathKey, expected: defType, found: curType });
      }
      continue;
    }

    if (isPlainObject(defVal)) {
      const nested = collectSchemaIssues(defVal, curVal, pathKey);
      missing.push(...nested.missing);
      typeMismatches.push(...nested.typeMismatches);
    }
  }

  return { missing, typeMismatches };
}

function collectUnknownKeys(defaults, current, prefix = '') {
  const unknown = [];

  if (!isPlainObject(current)) return unknown;

  const defIsObj = isPlainObject(defaults);
  for (const key of Object.keys(current)) {
    const pathKey = prefix ? `${prefix}.${key}` : key;
    const curVal = current[key];
    const defVal = defIsObj ? defaults[key] : undefined;

    if (!defIsObj || !(key in defaults)) {
      unknown.push({ path: pathKey, type: typeOf(curVal) });
      continue;
    }

    if (isPlainObject(curVal) && isPlainObject(defVal)) {
      unknown.push(...collectUnknownKeys(defVal, curVal, pathKey));
    }
  }

  return unknown;
}

function usage(exitCode = 0) {
  const text = `
Usage: gsd-config <command> [options]

Commands:
  path                         Print resolved .planning/config.json path
  get <dot.path>               Get a config value (e.g., enhancements.decision_ledger)
  set <dot.path> <value>       Set a config value (value parsed as JSON when possible)
  validate                     Validate config.json and compare to template schema
  upgrade                      Merge config with template defaults (preserves overrides)

Options:
  --project-dir <dir>          Override project directory (defaults to CLAUDE_PROJECT_DIR or cwd)
  --format <raw|json|summary>  Output format (default varies by command)
  --default <value>            Default value for get when path missing (JSON or raw)
  --write                      Write changes (upgrade/set)
  --no-backup                  Don't create a backup when writing
  --help                       Show help
`.trim();
  // eslint-disable-next-line no-console
  console.log(text);
  process.exit(exitCode);
}

function parseJsonish(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (trimmed.length === 0) return '';

  // JSON-looking values
  if (
    trimmed === 'true' ||
    trimmed === 'false' ||
    trimmed === 'null' ||
    trimmed.startsWith('{') ||
    trimmed.startsWith('[') ||
    trimmed.startsWith('"') ||
    trimmed.startsWith("'") ||
    /^[+-]?\d+(\.\d+)?$/.test(trimmed)
  ) {
    try {
      // Support single-quoted strings: 'foo'
      if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
        return trimmed.slice(1, -1);
      }
      return JSON.parse(trimmed);
    } catch {
      // Fall through to raw string
    }
  }

  return value;
}

function formatValue(value, format) {
  if (format === 'json') return JSON.stringify(value, null, 2);
  if (format === 'raw') {
    if (value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value === null) return 'null';
    return JSON.stringify(value);
  }
  return String(value);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];

  if (!command || args.help) usage(0);

  const projectDir = resolveProjectDir(args['project-dir']);
  const configPath = path.join(projectDir, '.planning', 'config.json');

  const claudeDir = path.resolve(__dirname, '..');
  const templatePath = path.join(claudeDir, 'get-shit-done', 'templates', 'config.json');

  if (command === 'path') {
    // eslint-disable-next-line no-console
    console.log(configPath);
    process.exit(0);
  }

  if (command === 'get') {
    const dotPath = args._[1];
    if (!dotPath) usage(2);

    const config = readJsonSafe(configPath);
    const fallback = args.default !== undefined ? parseJsonish(String(args.default)) : undefined;

    if (!config.ok) {
      if (fallback !== undefined) {
        // eslint-disable-next-line no-console
        console.log(formatValue(fallback, args.format || 'raw'));
        process.exit(0);
      }
      process.exit(config.code === 'missing' ? 1 : 2);
    }

    const { found, value } = getByPath(config.data, dotPath);
    if (!found) {
      if (fallback !== undefined) {
        // eslint-disable-next-line no-console
        console.log(formatValue(fallback, args.format || 'raw'));
        process.exit(0);
      }
      process.exit(1);
    }

    // eslint-disable-next-line no-console
    console.log(formatValue(value, args.format || 'raw'));
    process.exit(0);
  }

  if (command === 'set') {
    const dotPath = args._[1];
    const rawValue = args._[2];
    if (!dotPath || rawValue === undefined) usage(2);

    const value = parseJsonish(String(rawValue));
    const config = readJsonSafe(configPath);
    if (!config.ok && config.code !== 'missing') {
      // eslint-disable-next-line no-console
      console.error(`ERROR: invalid config.json (${config.error})`);
      process.exit(2);
    }

    const current = config.ok ? config.data : {};
    const next = setByPath(current, dotPath, value);

    const shouldWrite = Boolean(args.write);
    if (shouldWrite) {
      const planningDir = path.dirname(configPath);
      if (!fs.existsSync(planningDir)) fs.mkdirSync(planningDir, { recursive: true });
      if (!args['no-backup'] && fs.existsSync(configPath)) {
        const backupPath = `${configPath}.bak.${Math.floor(Date.now() / 1000)}`;
        fs.copyFileSync(configPath, backupPath);
      }
      writeJson(configPath, next);
    }

    // eslint-disable-next-line no-console
    console.log(formatValue(next, args.format || 'json'));
    process.exit(0);
  }

  if (command === 'validate') {
    const format = String(args.format || 'summary');

    const config = readJsonSafe(configPath);
    const template = readJsonSafe(templatePath);

    if (format === 'json') {
      const out = {
        configPath,
        templatePath,
        configOk: config.ok,
        templateOk: template.ok,
        configError: config.ok ? null : config.error,
        templateError: template.ok ? null : template.error,
        missing: [],
        typeMismatches: [],
        unknownKeys: [],
      };

      if (config.ok && template.ok) {
        const issues = collectSchemaIssues(template.data, config.data);
        out.missing = issues.missing.map(i => i.path);
        out.typeMismatches = issues.typeMismatches;
        out.unknownKeys = collectUnknownKeys(template.data, config.data).map(i => i.path);
      }

      // eslint-disable-next-line no-console
      console.log(JSON.stringify(out, null, 2));
      process.exit(config.ok ? 0 : config.code === 'missing' ? 1 : 2);
    }

    // summary format
    // eslint-disable-next-line no-console
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    // eslint-disable-next-line no-console
    console.log(' GSD ► CONFIG CHECK');
    // eslint-disable-next-line no-console
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // eslint-disable-next-line no-console
    console.log(`Config:   ${configPath}`);
    // eslint-disable-next-line no-console
    console.log(`Template: ${templatePath}\n`);

    if (!template.ok) {
      // eslint-disable-next-line no-console
      console.log(`✗ Template missing/invalid: ${template.error}`);
      process.exit(2);
    }

    if (!config.ok) {
      // eslint-disable-next-line no-console
      console.log(`✗ Config missing/invalid: ${config.error}`);
      // eslint-disable-next-line no-console
      console.log('\nNext: run /gsd:migrate-config to create/upgrade config.json');
      process.exit(config.code === 'missing' ? 1 : 2);
    }

    const issues = collectSchemaIssues(template.data, config.data);
    const unknown = collectUnknownKeys(template.data, config.data);

    if (issues.missing.length === 0 && issues.typeMismatches.length === 0) {
      // eslint-disable-next-line no-console
      console.log('✓ Config matches template schema (no missing keys, no type mismatches)');
    } else {
      if (issues.missing.length > 0) {
        // eslint-disable-next-line no-console
        console.log(`⚠ Missing keys (${issues.missing.length}):`);
        for (const m of issues.missing.slice(0, 20)) {
          // eslint-disable-next-line no-console
          console.log(`  - ${m.path} (default: ${formatValue(m.defaultValue, 'raw')})`);
        }
        if (issues.missing.length > 20) {
          // eslint-disable-next-line no-console
          console.log(`  - …and ${issues.missing.length - 20} more`);
        }
        // eslint-disable-next-line no-console
        console.log('');
      }

      if (issues.typeMismatches.length > 0) {
        // eslint-disable-next-line no-console
        console.log(`✗ Type mismatches (${issues.typeMismatches.length}):`);
        for (const tm of issues.typeMismatches.slice(0, 20)) {
          // eslint-disable-next-line no-console
          console.log(`  - ${tm.path} (expected ${tm.expected}, found ${tm.found})`);
        }
        if (issues.typeMismatches.length > 20) {
          // eslint-disable-next-line no-console
          console.log(`  - …and ${issues.typeMismatches.length - 20} more`);
        }
        // eslint-disable-next-line no-console
        console.log('');
      }

      // eslint-disable-next-line no-console
      console.log('Next: run /gsd:migrate-config to fill missing keys');
    }

    if (unknown.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`ℹ Unknown keys preserved (${unknown.length})`);
    }

    process.exit(issues.typeMismatches.length > 0 ? 3 : 0);
  }

  if (command === 'upgrade') {
    const format = String(args.format || 'summary');
    const shouldWrite = Boolean(args.write);

    const template = readJsonSafe(templatePath);
    if (!template.ok) {
      // eslint-disable-next-line no-console
      console.error(`ERROR: template config missing/invalid (${template.error})`);
      process.exit(2);
    }

    const config = readJsonSafe(configPath);
    if (!config.ok && config.code !== 'missing') {
      // eslint-disable-next-line no-console
      console.error(`ERROR: invalid config.json (${config.error})`);
      process.exit(2);
    }

    const current = config.ok ? config.data : {};
    const merged = deepMergeDefaults(template.data, current);

    const issues = collectSchemaIssues(template.data, current);
    const unknown = collectUnknownKeys(template.data, current);

    if (format === 'json') {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(merged, null, 2));
    } else {
      // eslint-disable-next-line no-console
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      // eslint-disable-next-line no-console
      console.log(' GSD ► CONFIG UPGRADE');
      // eslint-disable-next-line no-console
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      // eslint-disable-next-line no-console
      console.log(`Config:   ${configPath}`);
      // eslint-disable-next-line no-console
      console.log(`Template: ${templatePath}\n`);

      if (issues.missing.length === 0 && issues.typeMismatches.length === 0) {
        // eslint-disable-next-line no-console
        console.log('✓ No schema changes needed (config already matches template keys/types)');
      } else {
        if (issues.missing.length > 0) {
          // eslint-disable-next-line no-console
          console.log(`Will add missing keys (${issues.missing.length}):`);
          for (const m of issues.missing.slice(0, 25)) {
            // eslint-disable-next-line no-console
            console.log(`  - ${m.path} (default: ${formatValue(m.defaultValue, 'raw')})`);
          }
          if (issues.missing.length > 25) {
            // eslint-disable-next-line no-console
            console.log(`  - …and ${issues.missing.length - 25} more`);
          }
          // eslint-disable-next-line no-console
          console.log('');
        }

        if (issues.typeMismatches.length > 0) {
          // eslint-disable-next-line no-console
          console.log(`✗ Type mismatches detected (${issues.typeMismatches.length}) — upgrade will NOT change your values:`);
          for (const tm of issues.typeMismatches.slice(0, 25)) {
            // eslint-disable-next-line no-console
            console.log(`  - ${tm.path} (expected ${tm.expected}, found ${tm.found})`);
          }
          if (issues.typeMismatches.length > 25) {
            // eslint-disable-next-line no-console
            console.log(`  - …and ${issues.typeMismatches.length - 25} more`);
          }
          // eslint-disable-next-line no-console
          console.log('');
        }
      }

      if (unknown.length > 0) {
        // eslint-disable-next-line no-console
        console.log(`ℹ Unknown keys will be preserved (${unknown.length})`);
      }
    }

    if (shouldWrite) {
      const planningDir = path.dirname(configPath);
      if (!fs.existsSync(planningDir)) fs.mkdirSync(planningDir, { recursive: true });

      if (!args['no-backup'] && fs.existsSync(configPath)) {
        const backupPath = `${configPath}.bak.${Math.floor(Date.now() / 1000)}`;
        fs.copyFileSync(configPath, backupPath);
        if (format !== 'json') {
          // eslint-disable-next-line no-console
          console.log(`\nBackup:   ${backupPath}`);
        }
      }

      writeJson(configPath, merged);

      if (format !== 'json') {
        // eslint-disable-next-line no-console
        console.log(`Wrote:    ${configPath}`);
      }
    } else if (format !== 'json') {
      // eslint-disable-next-line no-console
      console.log(`\nRun: node "${__filename}" upgrade --write`);
    }

    process.exit(0);
  }

  usage(2);
}

if (require.main === module) main();

module.exports = {
  deepMergeDefaults,
  collectSchemaIssues,
  collectUnknownKeys,
  getByPath,
  setByPath,
};
