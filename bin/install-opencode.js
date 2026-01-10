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

const repoRoot = path.resolve(__dirname, "..")
const gsdRoot = path.join(configDir, "get-shit-done")
const pluginDir = path.join(configDir, "plugin")
const toolDir = path.join(configDir, "tool")

const pluginSource = path.join(repoRoot, ".opencode", "plugin", "gsd.ts")
const toolSource = path.join(repoRoot, ".opencode", "tool", "gsd.ts")
const commandsSource = path.join(repoRoot, "commands", "gsd")
const templatesSource = path.join(repoRoot, "get-shit-done")

fs.mkdirSync(pluginDir, { recursive: true })
fs.mkdirSync(toolDir, { recursive: true })
fs.mkdirSync(path.join(gsdRoot, "commands"), { recursive: true })

fs.cpSync(pluginSource, path.join(pluginDir, "gsd.ts"), {
  recursive: false,
  force: true,
})
fs.cpSync(toolSource, path.join(toolDir, "gsd.ts"), {
  recursive: false,
  force: true,
})
fs.cpSync(templatesSource, gsdRoot, { recursive: true, force: true })
fs.cpSync(commandsSource, path.join(gsdRoot, "commands", "gsd"), {
  recursive: true,
  force: true,
})

console.log(`Installed GSD OpenCode plugin to ${configDir}`)
