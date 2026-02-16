Now I have a comprehensive understanding of the GSD repository structure. Let me write the STACK.md file:

# STACK.md

**Repository:** get-shit-done-cc  
**Version:** 1.20.0  
**Description:** A meta-prompting, context engineering and spec-driven development system for Claude Code, OpenCode, and Gemini CLI  
**Author:** TÂCHES

---

## Primary Languages

| Language | Primary Use | Files |
|----------|-------------|-------|
| **Node.js (CommonJS)** | CLI tools, build scripts, hooks | `bin/install.js`, `get-shit-done/bin/gsd-tools.cjs`, `hooks/*.js` |
| **Markdown** | Commands, workflows, agents, templates | `commands/**/*.md`, `agents/*.md`, `get-shit-done/**/*.md` |
| **JSON** | Configuration, package metadata | `package.json`, `get-shit-done/templates/config.json` |

---

## Runtime Requirements

| Requirement | Version/Constraint | Notes |
|-------------|-------------------|-------|
| **Node.js** | `>=16.7.0` | Specified in `package.json` engines field |
| **Claude Code** | Latest | Primary runtime (`~/.claude/` or `./.claude/`) |
| **OpenCode** | Latest | Alternative runtime (`~/.config/opencode/` or `./.opencode/`) |
| **Gemini CLI** | Latest | Alternative runtime (`~/.gemini/` or `./.gemini/`) |

---

## Package Manager

**npm** (native Node.js package manager)

No additional package managers (pnpm, yarn, bun) are used in this project.

---

## Key Dependencies

| Category | Dependency | Version | Purpose |
|----------|------------|---------|---------|
| **Build Tool** | `esbuild` | `^0.24.0` | Used in `scripts/build-hooks.js` for hook bundling (development only) |
| **Runtime** | *None* | — | Zero runtime dependencies - pure Node.js standard library |

---

## CLI / Tooling

### Installation Tool
- **`bin/install.js`** - Main entry point for GSD installation
  ```bash
  npx get-shit-done-cc                    # Interactive install
  npx get-shit-done-cc --claude --local   # Non-interactive: local Claude install
  npx get-shit-done-cc --opencode --global # Non-interactive: global OpenCode install
  npx get-shit-done-cc --gemini --global   # Non-interactive: global Gemini install
  npx get-shit-done-cc --all --global      # Non-interactive: install to all runtimes
  npx get-shit-done-cc --claude --local --uninstall  # Uninstall
  ```

### GSD Tools CLI
- **`get-shit-done/bin/gsd-tools.cjs`** - Core utility for GSD workflow operations (47,000+ lines)
  ```bash
  node get-shit-done/bin/gsd-tools.cjs <command> [args]
  ```
  
  **Key Commands:**
  ```bash
  # State management
  node get-shit-done/bin/gsd-tools.cjs state load
  node get-shit-done/bin/gsd-tools.cjs state update <field> <value>
  
  # Phase operations
  node get-shit-done/bin/gsd-tools.cjs phase add <description>
  node get-shit-done/bin/gsd-tools.cjs phase insert <after> <description>
  node get-shit-done/bin/gsd-tools.cjs phase remove <phase> [--force]
  node get-shit-done/bin/gsd-tools.cjs phase complete <phase>
  node get-shit-done/bin/gsd-tools.cjs phase next-decimal <phase>
  
  # Roadmap operations
  node get-shit-done/bin/gsd-tools.cjs roadmap get-phase <phase>
  node get-shit-done/bin/gsd-tools.cjs roadmap analyze
  
  # Milestone operations
  node get-shit-done/bin/gsd-tools.cjs milestone complete <version> --name <name>
  
  # Progress
  node get-shit-done/bin/gsd-tools.cjs progress [json|table|bar]
  
  # Scaffolding
  node get-shit-done/bin/gsd-tools.cjs scaffold context --phase <N>
  node get-shit-done/bin/gsd-tools.cjs scaffold uat --phase <N>
  node get-shit-done/bin/gsd-tools.cjs scaffold verification --phase <N>
  node get-shit-done/bin/gsd-tools.cjs scaffold phase-dir --phase <N> --name <name>
  
  # Frontmatter operations
  node get-shit-done/bin/gsd-tools.cjs frontmatter get <file> [--field k]
  node get-shit-done/bin/gsd-tools.cjs frontmatter set <file> --field k --value jsonVal
  
  # Validation
  node get-shit-done/bin/gsd-tools.cjs validate consistency
  node get-shit-done/bin/gsd-tools.cjs validate health [--repair]
  ```

### Build Scripts
- **`scripts/build-hooks.js`** - Copies hooks to `hooks/dist/` directory
  ```bash
  npm run build:hooks      # Build hooks for distribution
  ```

---

## Distribution Model

### npm Package
- **Package Name:** `get-shit-done-cc`
- **Distribution:** npm registry (public)
- **Installation:** `npx get-shit-done-cc@latest`

### Package Contents
```
get-shit-done-cc/
├── bin/
│   └── install.js              # Installer script (bin entry point)
├── commands/
│   └── gsd/                    # 26+ slash commands
├── agents/
│   └── *.md                    # 10 agent definitions
├── hooks/
│   └── dist/                   # Built hooks
└── get-shit-done/
    ├── bin/
    │   └── gsd-tools.cjs       # Core CLI utility
    ├── templates/
    │   ├── *.md               # 25+ markdown templates
    │   ├── config.json        # Default configuration
    │   └── codebase/          # 7 codebase mapping templates
    └── workflows/
        └── *.md               # 33+ workflow definitions
```

---

## Development Workflow Commands

### Build
```bash
npm run build:hooks    # Copy hooks to dist/
npm run prepublishOnly  # Runs build:hooks automatically before publish
```

### Testing
```bash
npm test               # Run Node.js test suite
# Uses: get-shit-done/bin/gsd-tools.test.cjs (2273 lines)
# Test runner: node:test (built-in Node.js test framework)
```

### Versioning & Publishing
```bash
npm version <patch|minor|major>  # Bump version in package.json
npm publish                     # Publish to npm registry
```

### Development Installation (Local Testing)
```bash
git clone https://github.com/glittercowboy/get-shit-done.git
cd get-shit-done
node bin/install.js --claude --local    # Install to ./.claude/ for testing
```

---

## Directory Structure Reference

```
get-shit-done/
├── bin/
│   └── install.js              # Main installer (500+ lines)
├── commands/
│   └── gsd/                    # 26 slash commands
│       ├── new-project.md
│       ├── discuss-phase.md
│       ├── plan-phase.md
│       ├── execute-phase.md
│       ├── verify-work.md
│       ├── new-milestone.md
│       ├── complete-milestone.md
│       ├── add-phase.md
│       ├── insert-phase.md
│       ├── remove-phase.md
│       ├── quick.md
│       ├── map-codebase.md
│       ├── progress.md
│       ├── settings.md
│       ├── set-profile.md
│       ├── health.md
│       ├── update.md
│       ├── help.md
│       ├── join-discord.md
│       ├── pause-work.md
│       ├── resume-work.md
│       ├── check-todos.md
│       ├── add-todo.md
│       ├── debug.md
│       ├── cleanup.md
│       ├── reapply-patches.md
│       ├── research-phase.md
│       ├── list-phase-assumptions.md
│       ├── plan-milestone-gaps.md
│       └── audit-milestone.md
├── agents/
│   ├── gsd-codebase-mapper.md
│   ├── gsd-plan-checker.md
│   ├── gsd-project-researcher.md
│   ├── gsd-debugger.md
│   ├── gsd-integration-checker.md
│   ├── gsd-planner.md
│   ├── gsd-roadmapper.md
│   ├── gsd-phase-researcher.md
│   ├── gsd-research-synthesizer.md
│   ├── gsd-executor.md
│   └── gsd-verifier.md
├── hooks/
│   ├── gsd-check-update.js     # SessionStart: check for GSD updates
│   ├── gsd-statusline.js       # PreRespond: custom statusline
│   └── dist/                   # Built hooks (included in npm package)
├── get-shit-done/
│   ├── bin/
│   │   ├── gsd-tools.cjs       # Core CLI utility (~47KB, 47k+ lines)
│   │   └── gsd-tools.test.cjs  # Test suite (2,273 lines)
│   ├── templates/
│   │   ├── project.md
│   │   ├── requirements.md
│   │   ├── roadmap.md
│   │   ├── milestone.md
│   │   ├── state.md
│   │   ├── context.md
│   │   ├── phase-prompt.md
│   │   ├── research.md
│   │   ├── discovery.md
│   │   ├── summary.md
│   │   ├── summary-standard.md
│   │   ├── summary-complex.md
│   │   ├── summary-minimal.md
│   │   ├── verification-report.md
│   │   ├── UAT.md
│   │   ├── DEBUG.md
│   │   ├── continue-here.md
│   │   ├── planner-subagent-prompt.md
│   │   ├── debug-subagent-prompt.md
│   │   ├── user-setup.md
│   │   ├── milestone-archive.md
│   │   └── config.json
│   ├── templates/codebase/
│   │   ├── stack.md
│   │   ├── structure.md
│   │   ├── architecture.md
│   │   ├── conventions.md
│   │   ├── testing.md
│   │   ├── integrations.md
│   │   └── concerns.md
│   ├── templates/research-project/
│   │   ├── STACK.md
│   │   ├── SUMMARY.md
│   │   ├── FEATURES.md
│   │   ├── ARCHITECTURE.md
│   │   └── PITFALLS.md
│   ├── workflows/
│   │   ├── new-project.md
│   │   ├── new-milestone.md
│   │   ├── discuss-phase.md
│   │   ├── research-phase.md
│   │   ├── plan-phase.md
│   │   ├── execute-phase.md
│   │   ├── execute-plan.md
│   │   ├── verify-work.md
│   │   ├── verify-phase.md
│   │   ├── complete-milestone.md
│   │   ├── audit-milestone.md
│   │   ├── map-codebase.md
│   │   ├── progress.md
│   │   ├── help.md
│   │   ├── update.md
│   │   ├── settings.md
│   │   ├── set-profile.md
│   │   ├── health.md
│   │   ├── quick.md
│   │   ├── add-phase.md
│   │   ├── insert-phase.md
│   │   ├── remove-phase.md
│   │   ├── plan-milestone-gaps.md
│   │   ├── list-phase-assumptions.md
│   │   ├── add-todo.md
│   │   ├── check-todos.md
│   │   ├── debug.md
│   │   ├── diagnose-issues.md
│   │   ├── pause-work.md
│   │   ├── resume-project.md
│   │   ├── cleanup.md
│   │   ├── transition.md
│   │   └── discovery-phase.md
│   └── references/
│       ├── continuation-format.md
│       ├── git-planning-commit.md
│       ├── decimal-phase-calculation.md
│       ├── checkpoints.md
│       ├── git-integration.md
│       ├── questioning.md
│       ├── phase-argument-parsing.md
│       ├── verification-patterns.md
│       ├── tdd.md
│       ├── model-profile-resolution.md
│       ├── model-profiles.md
│       ├── planning-config.md
│       └── ui-brand.md
├── scripts/
│   └── build-hooks.js          # Hook build script
├── package.json                 # Package manifest
├── README.md                    # Main documentation
├── CHANGELOG.md                 # Version history
├── LICENSE                      # MIT License
├── SECURITY.md                  # Security policy
└── assets/                      # Images/logos
    ├── gsd-logo-2000.png
    ├── gsd-logo-2000.svg
    ├── gsd-logo-2000-transparent.png
    ├── gsd-logo-2000-transparent.svg
    └── terminal.svg
```

---

## Key File References

| File | Purpose | Lines (approx) |
|------|---------|----------------|
| `package.json` | Package manifest & scripts | 48 |
| `bin/install.js` | Installation CLI | 500+ |
| `get-shit-done/bin/gsd-tools.cjs` | Core workflow CLI | 47,000+ |
| `get-shit-done/bin/gsd-tools.test.cjs` | Test suite | 2,273 |
| `scripts/build-hooks.js` | Build hooks | 42 |
| `hooks/gsd-check-update.js` | Update checker | 62 |
| `hooks/gsd-statusline.js` | Statusline | 91 |
| `get-shit-done/templates/config.json` | Default config | 36 |

---

## Agent System Architecture

GSD uses a multi-agent orchestration model with 11 specialized agents:

| Agent | Purpose | Model Profiles (Quality/Balanced/Budget) |
|-------|---------|------------------------------------------|
| `gsd-planner` | Creates atomic task plans | Opus/Opus/Sonnet |
| `gsd-executor` | Implements plans | Opus/Sonnet/Sonnet |
| `gsd-verifier` | Verifies goal achievement | Sonnet/Sonnet/Haiku |
| `gsd-plan-checker` | Validates plans before execution | Sonnet/Sonnet/Haiku |
| `gsd-phase-researcher` | Researches phase implementation | Opus/Sonnet/Haiku |
| `gsd-project-researcher` | Researches project domain | Opus/Sonnet/Haiku |
| `gsd-research-synthesizer` | Synthesizes research findings | Sonnet/Sonnet/Haiku |
| `gsd-roadmapper` | Creates roadmap from requirements | Opus/Sonnet/Sonnet |
| `gsd-debugger` | Diagnoses and fixes issues | Opus/Sonnet/Sonnet |
| `gsd-codebase-mapper` | Analyzes existing codebase | Sonnet/Haiku/Haiku |
| `gsd-integration-checker` | Checks integration points | Sonnet/Sonnet/Haiku |

---

## Runtime Targets

### Claude Code
- **Global:** `~/.claude/commands/gsd/`
- **Local:** `./.claude/commands/gsd/`
- **Config:** `.claude/settings.json`

### OpenCode
- **Global:** `~/.config/opencode/commands/gsd/`
- **Local:** `./.opencode/commands/gsd/`

### Gemini CLI
- **Global:** `~/.gemini/commands/gsd/`
- **Local:** `./.gemini/commands/gsd/`

---

## Security Considerations

**Sensitive File Protection:** Users should add secrets to Claude Code's deny list in `.claude/settings.json`:
```json
{
  "permissions": {
    "deny": [
      "Read(.env)",
      "Read(.env.*)",
      "Read(**/secrets/*)",
      "Read(**/*credential*)",
      "Read(**/*.pem)",
      "Read(**/*.key)"
    ]
  }
}
```

---

## License

MIT License - See `LICENSE` file for details.
