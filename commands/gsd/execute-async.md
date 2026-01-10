---
name: gsd:execute-async
description: Execute a PLAN.md file in the background (non-blocking)
argument-hint: "<path-to-PLAN.md>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - AskUserQuestion
---

<objective>
Execute a PLAN.md file as a background agent, returning immediately for non-blocking workflow.

Uses Task tool with run_in_background: true to spawn agent that executes plan autonomously.
Tracks agent in agent-history.json with execution_mode: "background".
User can continue other work and check status with /gsd:status.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-phase.md
@~/.claude/get-shit-done/templates/agent-history.md
</execution_context>

<context>
Plan path: $ARGUMENTS

**Load project state first:**
@.planning/STATE.md

**Load workflow config:**
@.planning/config.json
</context>

<process>
1. **Validate plan exists:**
   ```bash
   test -f "$ARGUMENTS" || echo "Plan not found: $ARGUMENTS"
   ```

2. **Check if already executed:**
   ```bash
   SUMMARY="${ARGUMENTS//-PLAN.md/-SUMMARY.md}"
   test -f "$SUMMARY" && echo "Plan already executed - SUMMARY.md exists"
   ```

3. **Parse plan for checkpoints:**
   ```bash
   grep -c "type=\"checkpoint" "$ARGUMENTS" 2>/dev/null || echo "0"
   ```

   **If checkpoints found:**
   Warn user that background execution skips checkpoints:
   ```
   ⚠️ Plan contains [N] checkpoints
   Background execution will skip verification/decision points.

   Options:
   1. Continue anyway (checkpoints skipped)
   2. Use /gsd:execute-plan for interactive execution
   ```

4. **Spawn background agent:**
   Use Task tool with:
   - subagent_type: "general-purpose"
   - run_in_background: true
   - prompt: Full execution instructions including plan path

5. **Record to agent-history.json:**
   ```json
   {
     "agent_id": "[from Task response]",
     "task_description": "Execute plan [plan-name] (background)",
     "phase": "[extracted from plan]",
     "plan": "[extracted from plan]",
     "segment": null,
     "timestamp": "[current ISO timestamp]",
     "status": "spawned",
     "completion_timestamp": null,
     "execution_mode": "background",
     "output_file": "[from Task response]",
     "background_status": "running"
   }
   ```

6. **Return immediately with tracking info:**
   ```
   ⚡ Background execution started

   Plan: [plan-name]
   Agent ID: [agent_id]
   Output: [output_file]

   ════════════════════════════════════════
   You can continue working.

   Check status:  /gsd:status
   View output:   /gsd:status [agent_id]
   ════════════════════════════════════════
   ```
</process>

<background_agent_prompt>
When spawning the background agent, use this prompt structure:

```
Execute the plan at [plan-path] autonomously.

**Instructions:**
1. Read the PLAN.md file for objective, context, and tasks
2. Execute all tasks in order
3. Skip any checkpoint tasks (human interaction not available in background)
4. Follow all deviation rules from execute-phase.md
5. Create SUMMARY.md when complete
6. Commit changes with proper format

**Context loading:**
- Read @.planning/STATE.md first
- Load all @context files from the plan
- Follow execution_context workflow reference

**On completion:**
Report: plan name, tasks completed, SUMMARY path, commit hash

**On failure:**
Report: task that failed, error details, files modified before failure
```
</background_agent_prompt>

<success_criteria>
- [ ] Plan validated to exist
- [ ] Summary doesn't already exist (not re-executing)
- [ ] Background agent spawned via Task tool
- [ ] Agent tracked in agent-history.json with execution_mode: "background"
- [ ] User informed of agent ID and how to check status
- [ ] Control returned immediately (non-blocking)
</success_criteria>
