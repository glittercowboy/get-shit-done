---
name: gsd.help
description: "Show available GSD commands and usage guide"
argument-hint: ""
agent: agent
---

<objective>
Display the complete GSD command reference.

Output ONLY the reference content below. Do NOT add:
- Project-specific analysis
- Git status or file context
- Next-step suggestions
- Any commentary beyond the reference
</objective>

<execution_context>- Read file at: ./.claude/get-shit-done/workflows/help.md
</execution_context>

<process>
Output the complete GSD command reference from workflows/help.md.
Display the reference content directly — no additions or modifications.
</process>

