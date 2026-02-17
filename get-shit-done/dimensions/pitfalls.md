---
name: pitfalls
short_description: Common mistakes and how to avoid them
tags: [core]
suggested_project_types: [all]
---

Research common pitfalls and mistakes for this project domain.

Investigate and document:

1. **Critical pitfalls** — Mistakes that cause rewrites, data loss, or security breaches. The kind of errors that make you start over. Research post-mortems and "what I wish I knew" articles for this domain.
2. **Moderate pitfalls** — Mistakes that cause significant rework but not complete rewrites. Things that slow you down weeks, not months.
3. **Minor pitfalls** — Annoyances and gotchas that waste hours. Easy to avoid once you know about them.
4. **Phase-specific warnings** — Which pitfalls are most dangerous at which stage of development. Early architecture mistakes vs late-stage integration issues.

For each pitfall:
- **What goes wrong** — Concrete description of the failure
- **Why it happens** — The reasoning that leads developers down this path
- **Consequences** — What breaks, how badly, and how hard it is to fix
- **Prevention** — Specific, actionable steps to avoid it
- **Detection** — Warning signs that you're falling into this trap

Focus on pitfalls specific to this domain and technology stack. Skip generic advice like "write tests" or "use version control" — those apply to everything.

Use the output template at `~/.claude/get-shit-done/templates/research-project/PITFALLS.md`.

Quality gates:
- Pitfalls are specific to this domain, not textbook generics
- Prevention strategies are actionable, not vague
- Severity levels (critical/moderate/minor) are justified
- Phase-specific warnings map to likely project phases
