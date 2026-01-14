#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

// Colors
const cyan = '\x1b[36m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const dim = '\x1b[2m';
const reset = '\x1b[0m';

// Get version from package.json
const pkg = require('../package.json');

/**
 * Editor Detection Module
 */
class EditorDetector {
  static detect() {
    // Check for OpenCode indicators first
    if (this.isOpenCodeEnvironment()) {
      return 'opencode';
    }
    // Default to Claude Code
    return 'claude';
  }

  static isOpenCodeEnvironment() {
    // Check for ~/.opencode directory
    const opencodeDir = path.join(os.homedir(), '.opencode');
    if (fs.existsSync(opencodeDir)) {
      return true;
    }

    // Check for OpenCode-specific environment variables
    if (process.env.OPENCODE_CONFIG_DIR || process.env.OPENCODE_HOME) {
      return true;
    }

    // Check for OpenCode process (basic check)
    try {
      const { execSync } = require('child_process');
      const result = execSync('pgrep -f opencode', { encoding: 'utf8', timeout: 1000 });
      return result.trim().length > 0;
    } catch (e) {
      // Ignore errors, not running
    }

    return false;
  }
}

/**
 * Path Management Module
 */
class PathManager {
  constructor(editorType) {
    this.editorType = editorType;
    this.basePaths = {
      claude: '~/.claude',
      opencode: '~/.opencode'
    };
  }

  getBasePath() {
    return this.basePaths[this.editorType];
  }

  resolvePath(relativePath) {
    const base = this.getBasePath();
    return path.join(base, relativePath);
  }

  getCommandsPath() {
    return this.resolvePath('commands/gsd');
  }

  getSkillsPath() {
    return this.resolvePath('get-shit-done');
  }

  getConfigPath() {
    return this.resolvePath('settings.json');
  }
}

const banner = `
${cyan}   ██████╗ ███████╗██████╗
  ██╔════╝ ██╔════╝██╔══██╗
  ██║  ███╗███████╗██║  ██║
  ██║   ██║╚════██║██║  ██║
  ╚██████╔╝███████║██████╔╝
   ╚═════╝ ╚══════╝╚═════╝${reset}

  Get Shit Done ${dim}v${pkg.version}${reset}
  A meta-prompting, context engineering and spec-driven
  development system for Claude Code and OpenCode by TÂCHES.
`;

// Parse args
const args = process.argv.slice(2);
const hasGlobal = args.includes('--global') || args.includes('-g');
const hasLocal = args.includes('--local') || args.includes('-l');

// Parse --config-dir argument
function parseConfigDirArg() {
  const configDirIndex = args.findIndex(arg => arg === '--config-dir' || arg === '-c');
  if (configDirIndex !== -1) {
    const nextArg = args[configDirIndex + 1];
    // Error if --config-dir is provided without a value or next arg is another flag
    if (!nextArg || nextArg.startsWith('-')) {
      console.error(`  ${yellow}--config-dir requires a path argument${reset}`);
      process.exit(1);
    }
    return nextArg;
  }
  // Also handle --config-dir=value format
  const configDirArg = args.find(arg => arg.startsWith('--config-dir=') || arg.startsWith('-c='));
  if (configDirArg) {
    return configDirArg.split('=')[1];
  }
  return null;
}

// Parse --editor argument
function parseEditorArg() {
  const editorIndex = args.findIndex(arg => arg === '--editor' || arg === '-e');
  if (editorIndex !== -1) {
    const nextArg = args[editorIndex + 1];
    // Error if --editor is provided without a value or next arg is another flag
    if (!nextArg || nextArg.startsWith('-')) {
      console.error(`  ${yellow}--editor requires a value: claude or opencode${reset}`);
      process.exit(1);
    }
    if (!['claude', 'opencode'].includes(nextArg)) {
      console.error(`  ${yellow}--editor must be 'claude' or 'opencode'${reset}`);
      process.exit(1);
    }
    return nextArg;
  }
  // Also handle --editor=value format
  const editorArg = args.find(arg => arg.startsWith('--editor=') || arg.startsWith('-e='));
  if (editorArg) {
    const value = editorArg.split('=')[1];
    if (!['claude', 'opencode'].includes(value)) {
      console.error(`  ${yellow}--editor must be 'claude' or 'opencode'${reset}`);
      process.exit(1);
    }
    return value;
  }
  return null;
}

const explicitConfigDir = parseConfigDirArg();
const explicitEditor = parseEditorArg();
const hasHelp = args.includes('--help') || args.includes('-h');

console.log(banner);

// Show help if requested
if (hasHelp) {
  console.log(`  ${yellow}Usage:${reset} npx get-shit-done-cc [options]

  ${yellow}Options:${reset}
    ${cyan}-g, --global${reset}              Install globally (auto-detects editor: Claude or OpenCode)
    ${cyan}-l, --local${reset}               Install locally (to ./.claude or ./.opencode in current directory)
    ${cyan}-c, --config-dir <path>${reset}   Specify custom config directory (Claude or OpenCode)
    ${cyan}-e, --editor <type>${reset}       Force specific editor: claude or opencode
    ${cyan}-h, --help${reset}                Show this help message

  ${yellow}Examples:${reset}
    ${dim}# Auto-detect and install globally${reset}
    npx get-shit-done-cc --global

    ${dim}# Force install for OpenCode${reset}
    npx get-shit-done-cc --global --editor opencode

    ${dim}# Install to custom config directory${reset}
    npx get-shit-done-cc --global --config-dir ~/.opencode-custom

    ${dim}# Using environment variables${reset}
    CLAUDE_CONFIG_DIR=~/.claude-bc npx get-shit-done-cc --global
    OPENCODE_CONFIG_DIR=~/.opencode-dev npx get-shit-done-cc --global

    ${dim}# Install to current project only${reset}
    npx get-shit-done-cc --local

  ${yellow}Notes:${reset}
    GSD now supports both Claude Code and OpenCode editors.
    The installer auto-detects your environment, but you can force a specific editor with --editor.
    Config directory options work for both editors and take priority over environment variables.
`);
  process.exit(0);
}

/**
 * Expand ~ to home directory (shell doesn't expand in env vars passed to node)
 */
function expandTilde(filePath) {
  if (filePath && filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

/**
 * Recursively copy directory, replacing paths in .md files
 */
function copyWithPathReplacement(srcDir, destDir, pathPrefix) {
  fs.mkdirSync(destDir, { recursive: true });

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyWithPathReplacement(srcPath, destPath, pathPrefix);
    } else if (entry.name.endsWith('.md')) {
      // Replace ~/.claude/ with the appropriate prefix in markdown files
      let content = fs.readFileSync(srcPath, 'utf8');
      content = content.replace(/~\/\.claude\//g, pathPrefix);
      fs.writeFileSync(destPath, content);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Install to the specified directory
 */
function install(isGlobal) {
  const src = path.join(__dirname, '..');

  // Detect editor type
  const editorType = explicitEditor || EditorDetector.detect();
  const pathManager = new PathManager(editorType);

  // Determine config directory based on editor
  let configDir;
  if (editorType === 'opencode') {
    configDir = expandTilde(explicitConfigDir) || expandTilde(process.env.OPENCODE_CONFIG_DIR);
  } else {
    configDir = expandTilde(explicitConfigDir) || expandTilde(process.env.CLAUDE_CONFIG_DIR);
  }

  // Set default directories based on editor
  const defaultDirName = editorType === 'opencode' ? '.opencode' : '.claude';
  const defaultGlobalDir = configDir || path.join(os.homedir(), defaultDirName);
  const editorDir = isGlobal
    ? defaultGlobalDir
    : path.join(process.cwd(), defaultDirName);

  const locationLabel = isGlobal
    ? editorDir.replace(os.homedir(), '~')
    : editorDir.replace(process.cwd(), '.');

  // Path prefix for file references
  const pathPrefix = isGlobal
    ? (configDir ? `${editorDir}/` : `~/.${editorType === 'opencode' ? 'opencode' : 'claude'}/`)
    : `./.${editorType === 'opencode' ? 'opencode' : 'claude'}/`;

  console.log(`  Installing for ${cyan}${editorType === 'opencode' ? 'OpenCode' : 'Claude Code'}${reset} to ${cyan}${locationLabel}${reset}\n`);

  // Create commands directory
  const commandsDir = path.join(editorDir, 'commands');
  fs.mkdirSync(commandsDir, { recursive: true });

  // Copy commands/gsd with path replacement
  const gsdSrc = path.join(src, 'commands', 'gsd');
  const gsdDest = path.join(commandsDir, 'gsd');
  copyWithPathReplacement(gsdSrc, gsdDest, pathPrefix);
  console.log(`  ${green}✓${reset} Installed commands/gsd`);

  // Copy get-shit-done skill with path replacement
  const skillSrc = path.join(src, 'get-shit-done');
  const skillDest = path.join(editorDir, 'get-shit-done');
  copyWithPathReplacement(skillSrc, skillDest, pathPrefix);
  console.log(`  ${green}✓${reset} Installed get-shit-done`);

  // For OpenCode, also install the extension
  if (editorType === 'opencode') {
    const extensionSrc = path.join(src, 'commands', 'opencode');
    const extensionDest = path.join(editorDir, 'extensions', 'gsd-opencode');
    fs.mkdirSync(extensionDest, { recursive: true });

    // Copy extension files
    const extensionFiles = fs.readdirSync(extensionSrc);
    for (const file of extensionFiles) {
      const srcPath = path.join(extensionSrc, file);
      const destPath = path.join(extensionDest, file);
      if (fs.statSync(srcPath).isDirectory()) {
        copyWithPathReplacement(srcPath, destPath, pathPrefix);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
    console.log(`  ${green}✓${reset} Installed OpenCode extension`);
  }

  // Create or update settings.json for editor-specific configuration
  const ConfigManager = require('./config-manager');
  const configManager = new ConfigManager(editorType);

  // Set GSD configuration
  configManager.setGSDConfig({
    version: pkg.version,
    installedAt: new Date().toISOString(),
    editor: editorType
  });

  console.log(`  ${green}✓${reset} Updated configuration for ${editorType === 'opencode' ? 'OpenCode' : 'Claude Code'}`);

  const editorName = editorType === 'opencode' ? 'OpenCode' : 'Claude Code';
  const commandExample = editorType === 'opencode' ? 'opencode.gsd.help' : '/gsd:help';

  console.log(`
  ${green}Done!${reset} Launch ${editorName} and run ${cyan}${commandExample}${reset}.
`);
}

/**
 * Prompt for install location
 */
function promptLocation() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Detect editor for appropriate paths
  const editorType = explicitEditor || EditorDetector.detect();
  const pathManager = new PathManager(editorType);

  let configDir;
  if (editorType === 'opencode') {
    configDir = expandTilde(explicitConfigDir) || expandTilde(process.env.OPENCODE_CONFIG_DIR);
  } else {
    configDir = expandTilde(explicitConfigDir) || expandTilde(process.env.CLAUDE_CONFIG_DIR);
  }

  const defaultDirName = editorType === 'opencode' ? '.opencode' : '.claude';
  const globalPath = configDir || path.join(os.homedir(), defaultDirName);
  const globalLabel = globalPath.replace(os.homedir(), '~');
  const localLabel = `./${defaultDirName}`;
  const editorName = editorType === 'opencode' ? 'OpenCode' : 'Claude Code';

  console.log(`  ${yellow}Where would you like to install GSD for ${editorName}?${reset}

  ${cyan}1${reset}) Global ${dim}(${globalLabel})${reset} - available in all projects
  ${cyan}2${reset}) Local  ${dim}(${localLabel})${reset} - this project only
`);

  rl.question(`  Choice ${dim}[1]${reset}: `, (answer) => {
    rl.close();
    const choice = answer.trim() || '1';
    const isGlobal = choice !== '2';
    install(isGlobal);
  });
}

// Main
if (hasGlobal && hasLocal) {
  console.error(`  ${yellow}Cannot specify both --global and --local${reset}`);
  process.exit(1);
} else if (explicitConfigDir && hasLocal) {
  console.error(`  ${yellow}Cannot use --config-dir with --local${reset}`);
  process.exit(1);
} else if (hasGlobal) {
  install(true);
} else if (hasLocal) {
  install(false);
} else {
  promptLocation();
}
