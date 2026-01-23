# Workflow: Strategic Guidance (Dynamic)

<objective>
Provide project strategy advice by reading GSD capabilities from source and matching to user's situation. Assess dynamically, not from templates.
</objective>

<process>

## Step 1: Detect GSD Location and Version

```bash
if [ -f "bin/install.js" ] && [ -d "commands/gsd" ]; then
  GSD_ROOT="."
elif [ -d "$HOME/.claude/commands/gsd" ]; then
  GSD_ROOT="$HOME/.claude"
elif [ -d ".claude/commands/gsd" ]; then
  GSD_ROOT=".claude"
fi

# Check version
cat {GSD_ROOT}/../package.json 2>/dev/null | grep version || echo "version unknown"
```

## Step 2: Understand User's Situation

Ask if not provided:
1. What are you trying to build?
2. Experience with GSD (new / some / experienced)?
3. Timeline/constraints?
4. Greenfield or brownfield?
5. Production or prototype?

## Step 3: Read Current Capabilities

```bash
# What commands exist
ls {GSD_ROOT}/commands/gsd/*.md | xargs -n1 basename | sed 's/.md$//'

# What workflows exist
ls {GSD_ROOT}/get-shit-done/workflows/*.md | xargs -n1 basename | sed 's/.md$//'

# What agents exist
ls {GSD_ROOT}/agents/gsd-*.md | xargs -n1 basename | sed 's/.md$//'

# What config options exist
grep -h "config" {GSD_ROOT}/get-shit-done/workflows/*.md | head -20
```

## Step 4: Read Relevant Workflow Details

Based on situation, read specific workflows:

**For greenfield:**
```bash
cat {GSD_ROOT}/get-shit-done/workflows/discovery-phase.md
cat {GSD_ROOT}/commands/gsd/new-project.md
```

**For brownfield:**
```bash
cat {GSD_ROOT}/get-shit-done/workflows/map-codebase.md
cat {GSD_ROOT}/commands/gsd/map-codebase.md
```

**For quick iteration:**
```bash
cat {GSD_ROOT}/commands/gsd/quick.md
```

**For production:**
```bash
cat {GSD_ROOT}/agents/gsd-verifier.md
cat {GSD_ROOT}/agents/gsd-plan-checker.md
```

## Step 5: Match Situation to Capabilities

| Situation | Read These | Recommend |
|-----------|------------|-----------|
| New project | discovery-phase.md | Full flow with research |
| Existing code | map-codebase.md | Map first, then new-project |
| Prototype | quick.md | yolo mode, quick depth |
| Production | verifier.md, plan-checker.md | comprehensive depth, all agents |
| Bug fix | debug.md, quick.md | Debug skill or quick |
| Urgent work | insert-phase.md | Decimal phases |

## Step 6: Build Custom Recommendation

From source files, construct:

1. **Recommended config:**
```json
{
  "mode": "[based on situation]",
  "depth": "[based on complexity]",
  "model_profile": "[based on quality needs]",
  "workflow": {
    "research": "[based on familiarity]",
    "plan_check": "[based on production needs]",
    "verifier": "[almost always true]"
  }
}
```

2. **Recommended flow:**
- Which commands to run
- In what order
- With what arguments

3. **What to skip:**
- Optional steps that don't apply

4. **Gotchas for this situation:**
- Read from workflow error handling

</process>

<situation_patterns>
## Common Situations (Verify by Reading Source)

**Learning GSD:**
```bash
cat {GSD_ROOT}/commands/gsd/help.md
cat {GSD_ROOT}/README.md
```
Recommend: interactive mode, standard depth, full flow

**Production feature:**
```bash
cat {GSD_ROOT}/agents/gsd-verifier.md
cat {GSD_ROOT}/get-shit-done/references/checkpoints.md
```
Recommend: quality profile, comprehensive depth, all agents

**Quick prototype:**
```bash
cat {GSD_ROOT}/commands/gsd/quick.md
```
Recommend: yolo mode, quick depth, budget profile

**Existing codebase:**
```bash
cat {GSD_ROOT}/get-shit-done/workflows/map-codebase.md
```
Recommend: Map first, honor existing patterns
</situation_patterns>

<phase_sizing>
## Phase and Plan Sizing

Read planner constraints:
```bash
grep -A10 "task" {GSD_ROOT}/agents/gsd-planner.md | head -30
```

**Typical guidance (verify from source):**
- 2-3 tasks per plan
- 3-5 plans per phase
- One "vertical slice" per plan

If source says different, use source.
</phase_sizing>

<success_criteria>
- Read current GSD capabilities from source
- Match situation to actual features
- Recommend based on what actually exists
- Cite which files informed recommendation
- Acknowledge if capabilities have changed
</success_criteria>
