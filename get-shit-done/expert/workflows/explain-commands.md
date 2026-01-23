# Workflow: Explain GSD Commands (Dynamic)

<objective>
Answer questions about GSD commands by reading the actual command files. Never rely on cached knowledge - always read the source.
</objective>

<process>

## Step 1: Detect GSD Location

```bash
# Check if in GSD repo
if [ -f "bin/install.js" ] && [ -d "commands/gsd" ]; then
  echo "GSD_ROOT=."
elif [ -d "$HOME/.claude/commands/gsd" ]; then
  echo "GSD_ROOT=$HOME/.claude"
elif [ -d ".claude/commands/gsd" ]; then
  echo "GSD_ROOT=.claude"
else
  echo "GSD not found"
fi
```

## Step 2: Get Command List (if needed)

```bash
ls {GSD_ROOT}/commands/gsd/*.md | xargs -n1 basename | sed 's/.md$//'
```

## Step 3: Read the Specific Command

For command questions, read the actual file:

```bash
cat {GSD_ROOT}/commands/gsd/{command-name}.md
```

**What to look for in command files:**

| Section | Contains |
|---------|----------|
| YAML frontmatter | name, description, allowed-tools |
| `<execution_context>` | @file references to workflows |
| `<context>` | Runtime variables like $ARGUMENTS |
| Main body | The actual prompt/instructions |

## Step 4: Read Referenced Workflows

Commands load workflows via @file references. If the command references:
```
@~/.claude/get-shit-done/workflows/execute-plan.md
```

Read that workflow for detailed behavior:
```bash
cat {GSD_ROOT}/get-shit-done/workflows/execute-plan.md
```

## Step 5: Synthesize and Explain

From the source files, explain:
1. **Purpose** - What it does (from description + body)
2. **When to use** - Trigger scenarios
3. **What it creates/modifies** - Look for file writes in workflow
4. **Agents spawned** - Look for Task tool calls
5. **Gotchas** - Infer from workflow logic

## Step 6: Provide File Paths

Always tell the user which files you read:
```
Source: {GSD_ROOT}/commands/gsd/{command}.md
Workflow: {GSD_ROOT}/get-shit-done/workflows/{workflow}.md
```

</process>

<comparison_questions>
For "what's the difference between X and Y":

1. Read both command files
2. Read both workflows
3. Compare:
   - Different execution flows
   - Different state changes
   - Different agents spawned
   - When to use each
</comparison_questions>

<workflow_questions>
For "what commands do I use for X":

1. List all commands
2. Read descriptions from frontmatter
3. Match to user's scenario
4. Recommend with rationale
</workflow_questions>

<success_criteria>
- Read actual command file (not memory)
- Read referenced workflow
- Cite file paths in answer
- Explain current behavior (not outdated info)
</success_criteria>
