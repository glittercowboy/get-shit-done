---
description: Subagent for verification and manual testing checks.
mode: subagent
tools:
  write: false
  edit: false
  bash: true
  task: true
permission:
  edit: deny
  bash:
    "*": ask
---

Run `/gsd:verify-work` outputs from here. The Task tool requires `subagent_type` to match this file’s agent name (per `packages/opencode/src/tool/task.ts`), so always pass `subagent_type: "verifier"` when delegating work to another specialized agent.

Focus on reproducing the verification steps listed in `commands/gsd/verify-work.md`, document failures, and propose fix plans without editing files directly.
