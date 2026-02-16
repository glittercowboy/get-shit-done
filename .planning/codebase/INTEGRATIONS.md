The file has been written successfully to `/root/.openclaw/workspace-main/get-shit-done/.planning/codebase/INTEGRATIONS.md`. This comprehensive document covers all integrations and interfaces in the GSD codebase:

## Summary of INTEGRATIONS.md

The document documents these key integration points:

### CLI Runtime Interfaces
- **Claude Code, OpenCode, Gemini CLI** — Three different installation paths and command formats
- Environment variables for config directory overrides (`CLAUDE_CONFIG_DIR`, `GEMINI_CONFIG_DIR`, etc.)

### Git Integration
- Automatic `git init` for new projects
- Per-task atomic commits with standardized format
- Git tagging for milestone releases
- Branching strategies (none/phase/milestone) with configurable templates

### Shell & System Dependencies
- Node.js >= 16.7.0 requirement
- CommonJS mode enforcement via package.json
- Hooks system for statusline and update checking
- **gsd-tools CLI** — Central utility with 40+ commands for state management, phase operations, verification, and scaffolding

### File System Structure
- `.planning/` directory organization (PROJECT.md, ROADMAP.md, STATE.md, REQUIREMENTS.md, config.json)
- Phase directory structure with naming conventions (NN-{slug}, XX-N-PLAN.md, etc.)
- Milestone archiving and gitignore patterns

### External Services
- npm registry for version checking and updates
- Optional Brave Search API for web search (configurable)

### Security & Environment Assumptions
- Built-in secrets protection patterns
- Forbidden file patterns documented
- Platform support matrix (Linux/macOS/Windows with path normalization)

### CI/CD & Monitoring
- Integration patterns for CI environments
- YOLO mode for non-interactive workflows
- Terminal-only logging (no external error tracking)
