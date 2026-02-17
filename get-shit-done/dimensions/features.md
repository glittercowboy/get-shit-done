---
name: features
short_description: Table stakes vs differentiators for this domain
tags: [core]
suggested_project_types: [all]
---

Research the feature landscape for this project domain.

Investigate and categorize:

1. **Table stakes** — Features users expect by default. Missing any of these makes the product feel broken or incomplete. Research what competitors and established products in this domain all have in common.
2. **Differentiators** — Features that set a product apart. Not expected, but valued. Research what innovative products in this space do differently.
3. **Anti-features** — Features to explicitly NOT build. Things that seem useful but hurt the product (complexity, maintenance burden, user confusion). Research common feature bloat in this domain.
4. **Feature dependencies** — Which features require others to exist first. Map the dependency graph.
5. **MVP recommendation** — The minimum set of table stakes plus one differentiator that delivers the core value proposition.

For each feature:
- Describe it from the user's perspective ("User can X")
- Rate complexity (Low/Medium/High)
- Note dependencies on other features
- Flag any that require specific technical choices

Use the output template at `~/.claude/get-shit-done/templates/research-project/FEATURES.md`.

Quality gates:
- Categories are clear (table stakes vs differentiators vs anti-features)
- Complexity rated for each feature
- Dependencies between features identified
- MVP recommendation is opinionated, not wishy-washy
