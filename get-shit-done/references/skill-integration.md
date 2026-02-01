# Skill Integration

GSD can integrate with Claude Code skills to enhance planning and execution. Skills are reusable prompts that provide specialized capabilities.

## Overview

Skills extend GSD's capabilities by providing:
- Domain-specific expertise (testing, deployment, code review)
- Standardized workflows (commit conventions, PR creation)
- Tool integrations (Jira, Slack, BigQuery, Kubernetes)

## Configuration

Enable skill integration in `.planning/config.json`:

```json
{
  "skills": {
    "enabled": true,
    "discovery": "auto",
    "skill_paths": [],
    "skill_mappings": {}
  }
}
```

### Configuration Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable skill integration |
| `discovery` | string | `"auto"` | How to find skills: `"auto"`, `"manual"`, `"none"` |
| `skill_paths` | string[] | `[]` | Additional paths to search for skills |
| `skill_mappings` | object | `{}` | Map phase types to recommended skills |

## Skill Discovery

### Auto Discovery (`discovery: "auto"`)

GSD automatically discovers available skills by checking:

1. **Claude Code Skills Registry** - Skills available via `/` command
2. **Project Skills** - `.claude/skills/` in project root
3. **Custom Paths** - Paths in `skill_paths` configuration

### Manual Discovery (`discovery: "manual"`)

Only use skills explicitly listed in `skill_mappings`.

### No Discovery (`discovery: "none"`)

Disable skill integration entirely.

## Skill Mappings

Map phase keywords to relevant skills:

```json
{
  "skills": {
    "skill_mappings": {
      "testing": ["test-gen", "test-coverage", "unit-testing"],
      "deployment": ["k8s-deploy", "argocd-app", "gke-cluster"],
      "database": ["bq-schema", "bq-query", "bq-cost"],
      "code-quality": ["code-review", "code-smell", "refactor-code"],
      "documentation": ["changelog", "doc-sync"],
      "release": ["release-prep", "github-release", "github-pr"],
      "debugging": ["debug-code", "trace-error", "gsd:debug"],
      "integration": ["slack-search", "jira-issue", "confluence-search"]
    }
  }
}
```

## Usage in Planning

### Phase Planning

During `/gsd:plan-phase`, the planner checks if relevant skills exist:

```markdown
## Skill Recommendations

Based on phase keywords, these skills may help:

| Skill | Relevance | When to Use |
|-------|-----------|-------------|
| `/test-gen` | testing | Generate unit tests for new code |
| `/code-review` | code quality | Review implementation before commit |

Include in plan? These can be referenced in task <action> sections.
```

### Task Actions

Reference skills in task actions:

```xml
<task type="auto">
  <name>Task 3: Generate unit tests</name>
  <files>src/features/user/*.test.ts</files>
  <action>
    Use /test-gen skill to generate comprehensive unit tests for the User feature.
    Ensure coverage of edge cases and error conditions.
  </action>
  <verify>npm test -- --coverage shows >80% coverage for user module</verify>
  <done>All tests pass, coverage meets threshold</done>
</task>
```

## Usage in Execution

### Skill Invocation

The executor invokes skills when referenced in task actions:

1. **Detect skill reference** - Look for `/skill-name` pattern in action
2. **Verify skill available** - Check if skill exists
3. **Invoke skill** - Use `Skill` tool with appropriate arguments
4. **Continue task** - Apply skill output to complete task

### Skill Output Handling

Skill outputs are incorporated into task execution:

- **Code generation skills** - Apply generated code to specified files
- **Analysis skills** - Use findings to inform implementation
- **Workflow skills** - Follow skill's recommended process

## Best Practices

### When to Use Skills

**DO use skills for:**
- Specialized domain tasks (testing, deployment, data processing)
- Standardized workflows (commit, PR, release)
- Tool integrations (Jira, Slack, cloud services)
- Code quality tasks (review, refactoring, smell detection)

**DON'T use skills for:**
- Simple, self-contained tasks
- Tasks where skill overhead exceeds benefit
- Custom logic with no matching skill

### Skill Selection Guidelines

1. **Match phase intent** - Choose skills that align with phase goals
2. **Check skill scope** - Ensure skill applies to current context
3. **Consider dependencies** - Some skills require setup or credentials
4. **Prefer focused skills** - One skill per concern, not catch-all solutions

### Integration Patterns

**Pattern A: Skill-per-task**
```xml
<task type="auto">
  <action>Use /test-gen to create tests</action>
</task>
```

**Pattern B: Skill-before-verify**
```xml
<task type="auto">
  <action>Implement feature</action>
</task>
<task type="auto">
  <action>Use /code-review to check implementation</action>
</task>
```

**Pattern C: Skill-at-phase-boundary**
```xml
<!-- Last task in phase -->
<task type="auto">
  <action>Use /code-review for final review before phase completion</action>
</task>
```

## Skill Categories

### Workflow Skills
- `changelog` - Generate changelogs from git history
- `release-prep` - Prepare releases with version bumps
- `github-pr` - Create well-structured pull requests
- `github-release` - Create GitHub releases

### Testing Skills
- `test-gen` - Generate unit tests
- `test-coverage` - Analyze coverage gaps
- `unit-testing` - TDD workflow support

### Code Quality Skills
- `code-review` - Comprehensive code review
- `code-smell` - Detect code smells
- `refactor-code` - Safe refactoring guidance

### DevOps Skills
- `k8s-deploy` - Kubernetes deployments
- `argocd-app` - ArgoCD applications
- `gke-cluster` - GKE cluster management

### Data Skills
- `bq-schema` - BigQuery schema design
- `bq-query` - BigQuery query execution
- `bq-cost` - Query cost estimation

### Integration Skills
- `slack-search` - Search Slack channels
- `jira-issue` - Manage Jira issues
- `confluence-search` - Search Confluence

## Troubleshooting

### Skill Not Found

If a referenced skill isn't available:
1. Check skill name spelling
2. Verify skill is installed/registered
3. Check `skill_paths` configuration
4. Try manual discovery mode with explicit mapping

### Skill Execution Fails

If skill execution fails:
1. Check skill prerequisites (auth, dependencies)
2. Review skill documentation for requirements
3. Verify task context matches skill expectations
4. Check for conflicting skill invocations

### Performance Considerations

Skills add context overhead. For optimal performance:
- Limit skills to 1-2 per plan
- Prefer lightweight skills for frequent tasks
- Consider skill caching for repeated invocations
