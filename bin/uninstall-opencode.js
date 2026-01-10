#!/usr/bin/env node
const fs = require("fs")
const path = require("path")
const os = require("os")

const args = process.argv.slice(2)
const configArgIndex = args.findIndex((arg) => arg === "--config-dir")
const explicitConfigDir =
  configArgIndex === -1 ? null : args[configArgIndex + 1]

const configDir =
  explicitConfigDir ||
  process.env.OPENCODE_CONFIG_DIR ||
  path.join(os.homedir(), ".config", "opencode")

const gsdRoot = path.join(configDir, "get-shit-done")
const pluginPath = path.join(configDir, "plugin", "gsd.ts")
const toolPath = path.join(configDir, "tool", "gsd.ts")

if (fs.existsSync(gsdRoot)) {
  fs.rmSync(gsdRoot, { recursive: true, force: true })
}
if (fs.existsSync(pluginPath)) {
  fs.rmSync(pluginPath, { force: true })
}
if (fs.existsSync(toolPath)) {
  fs.rmSync(toolPath, { force: true })
}

console.log(`Removed GSD OpenCode plugin from ${configDir}`)
