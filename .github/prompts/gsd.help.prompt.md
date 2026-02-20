---
name: gsd.help
description: "Show available GSD commands and usage guide"
argument-hint: ""
tools: ['agent', 'search', 'read', 'vscode/askQuestions', 'execute', 'edit']
agent: agent
---

<!-- GENERATED FILE — DO NOT EDIT.
Source: commands/gsd/help.md
Regenerate: node scripts/generate-prompts.mjs
-->
<!-- upstream-tools: null (field absent in upstream command) -->

## Preflight (required)

If the local GSD install does not exist in this workspace, do this **once**:

1. Check for: `./.claude/get-shit-done/`
2. If missing, run:

```bash
npx get-shit-done-cc --claude --local
```

3. Then re-run the slash command: `/gsd.help`

---

## Copilot Runtime Adapter (important)

Upstream GSD command sources may reference an `AskUserQuestion` tool (Claude/OpenCode runtime concept).

In VS Code Copilot, **do not attempt to call a tool named `AskUserQuestion`**.
Instead, whenever the upstream instructions say "Use AskUserQuestion", use **#tool:vscode/askQuestions** with:

- Combine the **Header** and **Question** into a single clear question string.
- If the upstream instruction specifies **Options**, present them as numbered choices.
- If no options are specified, ask as a freeform question.

**Rules:**
1. If the options include "Other", "Something else", or "Let me explain", and the user selects it, follow up with a freeform question via #tool:vscode/askQuestions.
2. Follow the upstream branching and loop rules exactly as written (e.g., "if X selected, do Y; otherwise continue").
3. If the upstream flow says to **exit/stop** and run another command, tell the user to run that slash command next, then stop.
4. Use #tool:vscode/askQuestions freely — do not guess or assume user intent.

---

<objective>
Display the complete GSD command reference.

Output ONLY the reference content below. Do NOT add:
- Project-specific analysis
- Git status or file context
- Next-step suggestions
- Any commentary beyond the reference
</objective>

<execution_context>- Read file at: ../.claude/get-shit-done/workflows/help.md
</execution_context>

<process>
Output the complete GSD command reference from @../.claude/get-shit-done/workflows/help.md.
Display the reference content directly — no additions or modifications.
</process>
