---
name: suggest-skills
description: Discover and recommend skills for the current project or phase
arguments: "[phase-number]"
---

<command-name>suggest-skills</command-name>

<purpose>
Analyze the current project or specific phase and recommend relevant Claude Code skills that can enhance planning and execution.
</purpose>

<usage>
```text
/gsd:suggest-skills           # Analyze entire project
/gsd:suggest-skills 5         # Analyze specific phase
```

</usage>

<process>

<step name="load_context">
Load project context:

```bash
# Check if project exists
ls .planning/PROJECT.md .planning/ROADMAP.md 2>/dev/null

# Load project description
cat .planning/PROJECT.md 2>/dev/null | head -50

# Load roadmap for phase analysis
cat .planning/ROADMAP.md 2>/dev/null
```

If no project exists:
```bash
No GSD project found in current directory.

To get skill recommendations:
1. Initialize a project: /gsd:new-project
2. Or describe your project/task for general recommendations
```

</step>

<step name="discover_skills">
Discover available skills:

```bash
# Check for project-local skills
ls .claude/skills/*.md 2>/dev/null

# List Claude Code skills (if accessible)
# Skills are typically registered in Claude Code's skill registry
```

Build available skills inventory from:
1. Claude Code built-in skills
2. Project-local skills (`.claude/skills/`)
3. User-installed skill packages
</step>

<step name="analyze_project">
If no phase specified, analyze entire project:

**Extract keywords from:**
- PROJECT.md description and tech stack
- ROADMAP.md phase names and goals
- REQUIREMENTS.md (if exists)
- Existing codebase patterns

**Keyword categories:**
| Category | Keywords | Relevant Skills |
|----------|----------|-----------------|
| Testing | test, coverage, TDD, unit | test-gen, test-coverage, unit-testing |
| Deployment | deploy, k8s, kubernetes, docker | k8s-deploy, argocd-app, gke-cluster |
| Database | database, sql, query, schema, bigquery | bq-schema, bq-query, bq-cost |
| Code Quality | review, refactor, smell, lint | code-review, code-smell, refactor-code |
| Documentation | docs, changelog, readme | changelog, doc-sync |
| Release | release, version, tag, publish | release-prep, github-release |
| Git | commit, pr, branch | github-pr, smart-commit |
| Integration | jira, slack, confluence | jira-issue, slack-search, confluence-search |
| Debugging | debug, error, trace, fix | debug-code, trace-error, gsd:debug |
| Frontend | ui, component, react, vue | frontend-design |
| API | api, endpoint, rest, graphql | api-validation |
</step>

<step name="analyze_phase">
If phase specified, analyze that phase:

```bash
# Find phase directory
PHASE_DIR=$(ls -d .planning/phases/$PHASE-* .planning/phases/$(printf "%02d" $PHASE)-* 2>/dev/null | head -1)

# Load phase context
cat "$PHASE_DIR"/*-CONTEXT.md 2>/dev/null
cat "$PHASE_DIR"/*-RESEARCH.md 2>/dev/null
cat "$PHASE_DIR"/*-PLAN.md 2>/dev/null

# Get phase goal from roadmap
grep -A 5 "Phase $PHASE:" .planning/ROADMAP.md 2>/dev/null
```

Extract phase-specific keywords and match to skills.
</step>

<step name="generate_recommendations">
Generate skill recommendations:

```markdown
## Skill Recommendations

Based on {project|phase} analysis, these skills are recommended:

### High Relevance

| Skill | Match Reason | When to Use |
|-------|--------------|-------------|
| `/test-gen` | Phase involves new feature implementation | After implementing each feature |
| `/code-review` | Code quality is a project priority | Before committing major changes |

### Medium Relevance

| Skill | Match Reason | When to Use |
|-------|--------------|-------------|
| `/changelog` | Project has release workflow | During release preparation |

### Available but Not Matched

These skills are available but didn't match current context:
- `/bq-query` - No BigQuery usage detected
- `/k8s-deploy` - No Kubernetes configuration found

---

## Configuration

To enable skill integration, add to `.planning/config.json`:

\`\`\`json
{
  "skills": {
    "enabled": true,
    "discovery": "auto",
    "skill_mappings": {
      "testing": ["test-gen", "test-coverage"],
      "code-quality": ["code-review", "code-smell"]
    }
  }
}
\`\`\`

## Next Steps

1. Review recommended skills above
2. Add skill mappings to config.json
3. Reference skills in plan task actions:
   \`\`\`xml
   <action>Use /test-gen to create unit tests for UserService</action>
   \`\`\`
```
</step>

<step name="offer_configuration">
Offer to configure skills:

```bash
Would you like to:

1. **Add skill mappings to config** - Update .planning/config.json with recommended mappings
2. **View skill details** - Get more information about a specific skill
3. **Skip for now** - Continue without skill configuration

Select option or type skill name for details.
```

</step>

</process>

<skill_database>
## Known Skills Reference

### Workflow Skills
| Skill | Purpose | Trigger Keywords |
|-------|---------|------------------|
| `changelog` | Generate changelogs from git | changelog, changes, history |
| `release-prep` | Prepare releases | release, version, tag |
| `github-pr` | Create pull requests | pr, pull request, merge |
| `github-release` | Create GitHub releases | release, publish |
| `smart-commit` | Intelligent commits | commit |

### Testing Skills
| Skill | Purpose | Trigger Keywords |
|-------|---------|------------------|
| `test-gen` | Generate unit tests | test, unit, coverage |
| `test-coverage` | Analyze coverage gaps | coverage, untested |
| `unit-testing` | TDD workflow | tdd, test-driven |

### Code Quality Skills
| Skill | Purpose | Trigger Keywords |
|-------|---------|------------------|
| `code-review` | Review code | review, check, audit |
| `code-smell` | Detect smells | smell, quality, clean |
| `refactor-code` | Safe refactoring | refactor, restructure |

### DevOps Skills
| Skill | Purpose | Trigger Keywords |
|-------|---------|------------------|
| `k8s-deploy` | Kubernetes deploys | kubernetes, k8s, deploy |
| `argocd-app` | ArgoCD apps | argocd, gitops |
| `gke-cluster` | GKE clusters | gke, gcloud, cluster |

### Data Skills
| Skill | Purpose | Trigger Keywords |
|-------|---------|------------------|
| `bq-schema` | BigQuery schemas | bigquery, bq, schema |
| `bq-query` | BigQuery queries | query, sql, bigquery |
| `bq-cost` | Query cost analysis | cost, estimate, bigquery |

### Integration Skills
| Skill | Purpose | Trigger Keywords |
|-------|---------|------------------|
| `slack-search` | Search Slack | slack, message, channel |
| `jira-issue` | Manage Jira | jira, ticket, issue |
| `confluence-search` | Search Confluence | confluence, wiki, docs |

### Debugging Skills
| Skill | Purpose | Trigger Keywords |
|-------|---------|------------------|
| `debug-code` | Systematic debugging | debug, fix, error |
| `trace-error` | Error tracing | trace, root cause, stack |
| `gsd:debug` | GSD debug workflow | debug, investigate |
</skill_database>

<success_criteria>
- [ ] Project/phase context loaded
- [ ] Available skills discovered
- [ ] Keywords extracted from context
- [ ] Skills matched to keywords
- [ ] Recommendations presented with relevance levels
- [ ] Configuration guidance provided
- [ ] Next steps offered
</success_criteria>
