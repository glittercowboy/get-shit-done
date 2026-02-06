#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");

// Colors
const cyan = "\x1b[36m";
const green = "\x1b[32m";
const yellow = "\x1b[33m";
const dim = "\x1b[2m";
const reset = "\x1b[0m";

// Get version from package.json
const pkg = require("../package.json");

const banner = `
${cyan}   ██████╗ ███████╗██████╗
  ██╔════╝ ██╔════╝██╔══██╗
  ██║  ███╗███████╗██║  ██║
  ██║   ██║╚════██║██║  ██║
  ╚██████╔╝███████║██████╔╝
   ╚═════╝ ╚══════╝╚═════╝${reset}

  Get Shit Done ${dim}v${pkg.version}${reset}
  A meta-prompting, context engineering and spec-driven
  development system for OpenCode by TÂCHES.
`;

// Parse args
const args = process.argv.slice(2);
const hasGlobal = args.includes("--global") || args.includes("-g");
const hasLocal = args.includes("--local") || args.includes("-l");

// Parse --config-dir argument
function parseConfigDirArg() {
  const configDirIndex = args.findIndex((arg) => arg === "--config-dir" || arg === "-c");
  if (configDirIndex !== -1) {
    const nextArg = args[configDirIndex + 1];
    if (!nextArg || nextArg.startsWith("-")) {
      console.error(`  ${yellow}--config-dir requires a path argument${reset}`);
      process.exit(1);
    }
    return nextArg;
  }
  const configDirArg = args.find((arg) => arg.startsWith("--config-dir=") || arg.startsWith("-c="));
  if (configDirArg) {
    return configDirArg.split("=")[1];
  }
  return null;
}

const explicitConfigDir = parseConfigDirArg();
const hasHelp = args.includes("--help") || args.includes("-h");

console.log(banner);

// Show help if requested
if (hasHelp) {
  console.log(`  ${yellow}Usage:${reset} npx get-shit-done-opencode [options]

  ${yellow}Options:${reset}
    ${cyan}-g, --global${reset}              Install globally (to OpenCode config directory)
    ${cyan}-l, --local${reset}               Install locally (to ./.opencode in current directory)
    ${cyan}-c, --config-dir <path>${reset}   Specify custom OpenCode config directory
    ${cyan}-h, --help${reset}                Show this help message

  ${yellow}Examples:${reset}
    ${dim}# Install to default ~/.config/opencode directory${reset}
    npx get-shit-done-opencode --global

    ${dim}# Install to custom config directory${reset}
    npx get-shit-done-opencode --global --config-dir ~/.config/opencode-alt

    ${dim}# Install to current project only${reset}
    npx get-shit-done-opencode --local
`);
  process.exit(0);
}

/**
 * Expand ~ to home directory
 */
function expandTilde(filePath) {
  if (filePath && filePath.startsWith("~/")) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

function resolveGsdRoot() {
  try {
    const gsdPkg = require.resolve("get-shit-done-cc/package.json");
    return path.dirname(gsdPkg);
  } catch (e) {
    const localRoot = path.join(__dirname, "..", "..", "..");
    if (fs.existsSync(path.join(localRoot, "commands"))) return localRoot;
  }
  console.error(`  ${yellow}✗${reset} Failed to locate get-shit-done-cc assets`);
  process.exit(1);
}

function transformHook(content) {
  return content
    .replace(/get-shit-done-cc/g, "get-shit-done-opencode")
    .replace(/['"]\\.claude['"]/g, "'.config/opencode'");
}

function colorToHex(value) {
  const normalized = value.trim().toLowerCase();
  const map = {
    green: "#22c55e",
    blue: "#3b82f6",
    purple: "#8b5cf6",
    cyan: "#06b6d4",
    yellow: "#f59e0b",
    orange: "#f97316",
  };
  if (normalized.startsWith("#")) return normalized;
  return map[normalized] || normalized;
}

function toolsLineToBlock(line) {
  const raw = line.split(":").slice(1).join(":").trim();
  if (!raw) return [line];
  const tools = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.toLowerCase());
  const entries = tools.map((tool) => {
    const key = /^[a-z0-9_]+$/.test(tool) ? tool : `"${tool}"`;
    return `  ${key}: true`;
  });
  return ["tools:", ...entries];
}

function transformMarkdown(content, pathPrefix) {
  return content
    .replace(/~\/\.claude\//g, pathPrefix)
    .replace(/\bgsd:([a-z0-9-]+)/g, "gsd/$1")
    .replace(/npx get-shit-done-cc/g, "npx get-shit-done-opencode");
}

function transformAgentMarkdown(content, pathPrefix) {
  const updated = transformMarkdown(content, pathPrefix);
  const match = updated.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return updated;

  const lines = match[1].split(/\r?\n/);
  const out = [];

  for (const line of lines) {
    if (line.startsWith("tools:")) {
      out.push(...toolsLineToBlock(line));
      continue;
    }
    if (line.startsWith("color:")) {
      const value = line.split(":").slice(1).join(":").trim();
      const colorValue = colorToHex(value);
      out.push(`color: "${colorValue}"`);
      continue;
    }
    out.push(line);
  }

  return updated.replace(match[0], `---\n${out.join("\n")}\n---`);
}

/**
 * Recursively copy directory, transforming markdown files
 */
function copyWithTransform(srcDir, destDir, pathPrefix) {
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true });
  }
  fs.mkdirSync(destDir, { recursive: true });

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyWithTransform(srcPath, destPath, pathPrefix);
    } else if (entry.name.endsWith(".md")) {
      let content = fs.readFileSync(srcPath, "utf8");
      content = transformMarkdown(content, pathPrefix);
      fs.writeFileSync(destPath, content);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyCommands(srcDir, destRoot, pathPrefix) {
  const destDir = path.join(destRoot, "commands", "gsd");
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true });
  }
  fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    let content = fs.readFileSync(srcPath, "utf8");
    content = transformMarkdown(content, pathPrefix);
    fs.writeFileSync(destPath, content);
  }
}

/**
 * Verify a directory exists and contains files
 */
function verifyInstalled(dirPath, description) {
  if (!fs.existsSync(dirPath)) {
    console.error(`  ${yellow}✗${reset} Failed to install ${description}: directory not created`);
    return false;
  }
  try {
    const entries = fs.readdirSync(dirPath);
    if (entries.length === 0) {
      console.error(`  ${yellow}✗${reset} Failed to install ${description}: directory is empty`);
      return false;
    }
  } catch (e) {
    console.error(`  ${yellow}✗${reset} Failed to install ${description}: ${e.message}`);
    return false;
  }
  return true;
}

/**
 * Verify a file exists
 */
function verifyFileInstalled(filePath, description) {
  if (!fs.existsSync(filePath)) {
    console.error(`  ${yellow}✗${reset} Failed to install ${description}: file not created`);
    return false;
  }
  return true;
}

function readConfig(configPath) {
  if (!fs.existsSync(configPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (e) {
    return {};
  }
}

function writeConfig(configPath, config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
}

/**
 * Install to the specified directory
 */
function install(isGlobal) {
  const src = resolveGsdRoot();
  const configDir = expandTilde(explicitConfigDir) || expandTilde(process.env.OPENCODE_CONFIG_DIR);
  const defaultGlobalDir = configDir || path.join(os.homedir(), ".config", "opencode");
  const opencodeDir = isGlobal ? defaultGlobalDir : path.join(process.cwd(), ".opencode");

  const locationLabel = isGlobal
    ? opencodeDir.replace(os.homedir(), "~")
    : opencodeDir.replace(process.cwd(), ".");

  const pathPrefix = isGlobal ? (configDir ? `${opencodeDir}/` : "~/.config/opencode/") : "./.opencode/";

  console.log(`  Installing to ${cyan}${locationLabel}${reset}\n`);

  const failures = [];

  // Create commands directory and copy commands
  const gsdCommandsSrc = path.join(src, "commands", "gsd");
  if (fs.existsSync(gsdCommandsSrc)) {
    copyCommands(gsdCommandsSrc, opencodeDir, pathPrefix);
    const gsdCommandsDest = path.join(opencodeDir, "commands", "gsd");
    if (verifyInstalled(gsdCommandsDest, "commands/gsd")) {
      console.log(`  ${green}✓${reset} Installed commands/gsd`);
    } else {
      failures.push("commands/gsd");
    }
  } else {
    failures.push("commands/gsd");
  }

  // Copy get-shit-done assets with path replacement
  const gsdSrc = path.join(src, "get-shit-done");
  const gsdDest = path.join(opencodeDir, "get-shit-done");
  copyWithTransform(gsdSrc, gsdDest, pathPrefix);
  if (verifyInstalled(gsdDest, "get-shit-done")) {
    console.log(`  ${green}✓${reset} Installed get-shit-done`);
  } else {
    failures.push("get-shit-done");
  }

  // Copy agents to .opencode/agents (replace only gsd-*.md)
  const agentsSrc = path.join(src, "agents");
  if (fs.existsSync(agentsSrc)) {
    const agentsDest = path.join(opencodeDir, "agents");
    fs.mkdirSync(agentsDest, { recursive: true });

    if (fs.existsSync(agentsDest)) {
      for (const file of fs.readdirSync(agentsDest)) {
        if (file.startsWith("gsd-") && file.endsWith(".md")) {
          fs.unlinkSync(path.join(agentsDest, file));
        }
      }
    }

    const agentEntries = fs.readdirSync(agentsSrc, { withFileTypes: true });
    for (const entry of agentEntries) {
      if (entry.isFile() && entry.name.endsWith(".md")) {
        let content = fs.readFileSync(path.join(agentsSrc, entry.name), "utf8");
        content = transformAgentMarkdown(content, pathPrefix);
        fs.writeFileSync(path.join(agentsDest, entry.name), content);
      }
    }
    if (verifyInstalled(agentsDest, "agents")) {
      console.log(`  ${green}✓${reset} Installed agents`);
    } else {
      failures.push("agents");
    }
  }

  // Copy CHANGELOG.md
  const changelogSrc = path.join(src, "CHANGELOG.md");
  const changelogDest = path.join(opencodeDir, "get-shit-done", "CHANGELOG.md");
  if (fs.existsSync(changelogSrc)) {
    fs.copyFileSync(changelogSrc, changelogDest);
    if (verifyFileInstalled(changelogDest, "CHANGELOG.md")) {
      console.log(`  ${green}✓${reset} Installed CHANGELOG.md`);
    } else {
      failures.push("CHANGELOG.md");
    }
  }

  // Write VERSION file
  const versionDest = path.join(opencodeDir, "get-shit-done", "VERSION");
  fs.writeFileSync(versionDest, pkg.version);
  if (verifyFileInstalled(versionDest, "VERSION")) {
    console.log(`  ${green}✓${reset} Wrote VERSION (${pkg.version})`);
  } else {
    failures.push("VERSION");
  }

  // Copy update hook and configure opencode.json
  const hookSrc = path.join(src, "hooks", "gsd-check-update.js");
  const hookDestDir = path.join(opencodeDir, "get-shit-done", "hooks");
  const hookDest = path.join(hookDestDir, "gsd-check-update.js");
  fs.mkdirSync(hookDestDir, { recursive: true });
  if (fs.existsSync(hookSrc)) {
    let content = fs.readFileSync(hookSrc, "utf8");
    content = transformHook(content);
    fs.writeFileSync(hookDest, content);
    if (verifyFileInstalled(hookDest, "get-shit-done/hooks/gsd-check-update.js")) {
      console.log(`  ${green}✓${reset} Installed update hook`);
    } else {
      failures.push("get-shit-done/hooks/gsd-check-update.js");
    }
  } else {
    failures.push("get-shit-done/hooks/gsd-check-update.js");
  }

  const configPath = path.join(opencodeDir, "opencode.json");
  const config = readConfig(configPath);
  if (!config.experimental) config.experimental = {};
  if (!config.experimental.hook) config.experimental.hook = {};
  if (!config.experimental.hook.session_completed) {
    config.experimental.hook.session_completed = [];
  }

  const hookCommand = ["node", hookDest];
  const hasHook = config.experimental.hook.session_completed.some(
    (entry) =>
      Array.isArray(entry.command) &&
      entry.command.length === hookCommand.length &&
      entry.command.every((value, idx) => value === hookCommand[idx]),
  );
  if (!hasHook) {
    config.experimental.hook.session_completed.push({ command: hookCommand });
    writeConfig(configPath, config);
    console.log(`  ${green}✓${reset} Configured update hook in opencode.json`);
  }

  if (failures.length > 0) {
    console.error(`\n  ${yellow}Installation incomplete!${reset} Failed: ${failures.join(", ")}`);
    console.error(
      `  Try running directly: node ~/.npm/_npx/*/node_modules/get-shit-done-opencode/bin/install.js --global\n`,
    );
    process.exit(1);
  }
}

/**
 * Prompt for install location
 */
function promptLocation() {
  if (!process.stdin.isTTY) {
    console.log(`  ${yellow}Non-interactive terminal detected, defaulting to global install${reset}\n`);
    install(true);
    finishInstall();
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let answered = false;

  rl.on("close", () => {
    if (!answered) {
      answered = true;
      console.log(`\n  ${yellow}Input stream closed, defaulting to global install${reset}\n`);
      install(true);
      finishInstall();
    }
  });

  const configDir = expandTilde(explicitConfigDir) || expandTilde(process.env.OPENCODE_CONFIG_DIR);
  const globalPath = configDir || path.join(os.homedir(), ".config", "opencode");
  const globalLabel = globalPath.replace(os.homedir(), "~");

  console.log(`  ${yellow}Where would you like to install?${reset}

  ${cyan}1${reset}) Global ${dim}(${globalLabel})${reset} - available in all projects
  ${cyan}2${reset}) Local  ${dim}(./.opencode)${reset} - this project only
`);

  rl.question(`  Choice ${dim}[1]${reset}: `, (answer) => {
    answered = true;
    rl.close();
    const choice = answer.trim() || "1";
    const isGlobal = choice !== "2";
    install(isGlobal);
    finishInstall();
  });
}

function finishInstall() {
  console.log(`
  ${green}Done!${reset} Open OpenCode and run ${cyan}gsd/help${reset}.
`);
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
  finishInstall();
} else if (hasLocal) {
  install(false);
  finishInstall();
} else {
  promptLocation();
}
