---
hook: [EVENT_NAME]
description: [What this hook does]
---

<objective>
[What this hook accomplishes when triggered]
</objective>

<hook_context>
<!-- This block is injected by GSD at runtime -->
<!-- Available variables depend on the hook event -->
<!-- See get-shit-done/references/plugin-hooks.md for event context details -->
</hook_context>

<process>
1. [Step 1 - typically read context files]
2. [Step 2 - process/transform data]
3. [Step 3 - store/output results]
</process>

<error_handling>
[How to handle failures gracefully without blocking GSD]
</error_handling>

---

# Concrete Example: post-research Hook

Below is a complete example of a `post-research` hook that captures research findings for later processing.

---
hook: post-research
description: Captures research findings for knowledge graph indexing
---

<objective>
Extract structured data from RESEARCH.md and queue for knowledge graph ingestion.
This enables passive research capture without requiring explicit user action.
</objective>

<hook_context>
<!-- Injected by GSD when research phase completes -->
research_path: .planning/phases/02-auth/02-RESEARCH.md
phase: 02-auth
project_path: /path/to/project
</hook_context>

<process>
1. Read the research file at {research_path}
   - Parse markdown content
   - Handle file read errors gracefully

2. Extract structured data:
   - **Libraries discovered**: Name, purpose, URL, version constraints
   - **Patterns identified**: Pattern name, description, code examples
   - **Decisions made**: Decision text, rationale, alternatives considered
   - **External APIs**: Endpoint, authentication method, rate limits

3. Format extracted data as JSON:
   ```json
   {
     "phase": "{phase}",
     "timestamp": "{current_time}",
     "project": "{project_path}",
     "libraries": [...],
     "patterns": [...],
     "decisions": [...],
     "apis": [...]
   }
   ```

4. Append to plugin queue file:
   - Path: `.neo4j/pending-ingestion.jsonl`
   - One JSON object per line (JSONL format)
   - Create file if it doesn't exist

5. Log completion:
   - Success: "Captured research from {phase}: {count} items queued"
   - Empty: "No structured data found in {phase} research"
</process>

<error_handling>
**File not found:**
- Log: "Research file not found: {research_path}"
- Exit gracefully - GSD workflow continues

**Parse error:**
- Log: "Failed to parse research content: {error_message}"
- Exit gracefully - research file still usable by GSD

**Write failure:**
- Log: "Could not write to queue file: {error_message}"
- Retry once, then log and exit
- User can run /plugin:ingest manually later

**General principle:**
Never throw exceptions. Log the error and exit cleanly.
GSD hooks are non-blocking - failures should not impact the main workflow.
</error_handling>

---

# Guidelines for Hook Authors

## Keep it simple
Hooks should do one thing well. Complex logic belongs in workflows or agents.

## Fail gracefully
Always handle errors. Log useful messages. Never throw exceptions.

## Write locally
Queue data to plugin-specific files. Don't depend on external services being available.

## Log meaningfully
Use descriptive log messages that help debugging:
- Good: "Captured 5 libraries and 3 patterns from 02-auth research"
- Bad: "Hook completed"

## Don't modify GSD files
Write to plugin directories only. Never touch STATE.md, ROADMAP.md, or other GSD-managed files.

## Be fast
Hooks run synchronously. Heavy processing should be deferred to background jobs or explicit commands.
