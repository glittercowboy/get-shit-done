import { tool } from "@opencode-ai/plugin"
import { readFileSync, readdirSync, existsSync } from "node:fs"
import path from "node:path"

const configDir = path.resolve(import.meta.dir, "..")
const gsdRoot = path.join(configDir, "get-shit-done")
const commandsDir = path.join(gsdRoot, "commands", "gsd")

function readText(filePath: string) {
  return readFileSync(filePath, "utf8")
}

function parseFrontMatterName(content: string) {
  if (!content.startsWith("---\n")) return null
  const end = content.indexOf("\n---", 4)
  if (end === -1) return null
  const frontMatter = content.slice(4, end).split("\n")
  for (const line of frontMatter) {
    const match = line.match(/^name:\s*(.+)$/)
    if (match) return match[1].trim()
  }
  return null
}

function listCommandFiles() {
  if (!existsSync(commandsDir)) return []
  return readdirSync(commandsDir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => path.join(commandsDir, file))
}

function loadCommandsIndex() {
  const index = new Map<string, { name: string; filePath: string }>()
  for (const filePath of listCommandFiles()) {
    const content = readText(filePath)
    const name = parseFrontMatterName(content)
    if (!name) continue
    index.set(name, { name, filePath })
  }
  return index
}

function normalizeCommandName(input: string) {
  if (input.startsWith("gsd:")) return input
  return `gsd:${input}`
}

function loadReferences(content: string) {
  const references: Record<string, string> = {}
  const missing: string[] = []
  const regex = /@~\/\.claude\/get-shit-done\/([^\s]+)/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(content))) {
    const relPath = match[1]
    const sourcePath = path.join(gsdRoot, relPath)
    const key = `get-shit-done/${relPath}`
    if (references[key]) continue
    try {
      references[key] = readText(sourcePath)
    } catch {
      missing.push(key)
    }
  }

  return { references, missing }
}

export const list = tool({
  description: "List available GSD commands packaged in this repo",
  args: {},
  async execute() {
    const index = loadCommandsIndex()
    const commands = Array.from(index.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((entry) => ({ name: entry.name, file: entry.filePath }))

    return { commands }
  },
})

export const command = tool({
  description: "Load a GSD command and referenced workflows/templates",
  args: {
    name: tool.schema
      .string()
      .describe("Command name, e.g. gsd:new-project or new-project"),
    includeReferences: tool.schema
      .boolean()
      .optional()
      .describe("Include referenced workflows/templates (default true)"),
  },
  async execute(args) {
    const index = loadCommandsIndex()
    const name = normalizeCommandName(args.name)
    const entry = index.get(name)

    if (!entry) {
      return {
        error: `Unknown command: ${name}`,
        available: Array.from(index.keys()).sort(),
      }
    }

    const content = readText(entry.filePath)
    const includeReferences = args.includeReferences !== false
    const result = {
      name: entry.name,
      command: content,
      references: {} as Record<string, string>,
      missingReferences: [] as string[],
    }

    if (includeReferences) {
      const { references, missing } = loadReferences(content)
      result.references = references
      result.missingReferences = missing
    }

    return result
  },
})
