# Feature Research

**Domain:** Constitutional enforcement systems for dev tools
**Researched:** 2026-01-18
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = enforcement is meaningless.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Rule violation detection | Core purpose of enforcement — without detection, it's just documentation | MEDIUM | Requires pattern matching against commit history, file structure, or code patterns |
| Violation reporting with clear messages | Developers need to know WHAT failed and WHERE | LOW | Format: rule name, location, description. Standard across all enforcement tools |
| Severity levels (error vs warning) | Different rules have different criticality | LOW | Error = blocks, warning = reports. ESLint standard: off/warn/error |
| Override mechanism | No rule fits 100% of cases — developers need escape hatches | MEDIUM | Must log overrides for audit trail. Common pattern: `--no-verify` flag or inline comments |
| Enforcement point (when rules run) | Pre-commit, pre-push, or CI/CD gate | LOW | Git hooks are standard for client-side, CI for server-side enforcement |
| Rule documentation (why it exists) | Developers won't follow rules they don't understand | LOW | Each rule needs rationale. Critical for adoption |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Contextual "why it fails" explanations | Beyond "what's wrong" — teach the anti-pattern with examples | MEDIUM | SpecKit's strength: constitution explains architectural reasoning. Prevents repeat violations |
| TDD commit pattern validation | Validates RED-GREEN-REFACTOR cycle via commit sequence analysis | HIGH | Unique to TDD-focused workflows. Requires git history parsing, test detection, diff analysis |
| Multi-level constitution (global + project) | Base rules for all projects + project-specific overrides | MEDIUM | Hybrid model balances consistency with flexibility. Most tools are single-level only |
| NON-NEGOTIABLE principle marking | Explicit severity escalation beyond error-level | LOW | Makes philosophy visible in the constitution. Signals "this is core to how we work" |
| Automated lint checks at verification phase | Post-execution validation vs pre-commit blocking | MEDIUM | SpecKit pattern: analyze command validates compliance after generation. Catches drift |
| Violation fingerprinting | Track specific violations across time, detect new vs existing | HIGH | Prevents warning fatigue by only reporting newly introduced issues. OPA/SonarQube pattern |
| One-click fixes / auto-remediation | Present automated fixes as code suggestions | HIGH | Reduces friction. ESLint autofix standard, expanding with AI-generated fixes in 2025 |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Fatal enforcement (cannot override) | "Force compliance" mindset | Breaks emergency workflows, reduces autonomy, creates workaround culture (git commit history rewriting) | Error-level with logged overrides. Trust + verify |
| Real-time IDE enforcement during typing | "Catch issues immediately" | Interrupts flow state, high performance cost, warning fatigue from incomplete code | Run on save or commit, not keystroke |
| Enforcement of ALL documented conventions | "Everything should be automated" | Over-engineering. Not all patterns are automatable or worth the complexity | Focus on high-value violations (TDD, security, architecture) |
| GUI-based constitution editor | "Non-technical people should edit rules" | Wrong abstraction. Constitution is code-adjacent, belongs in version control with PR review | Markdown in git with PR workflow. Technical precision matters |
| Constitution versioning with sync impact reports | "Track changes rigorously" | Premature complexity. Adds migration overhead before proving enforcement value | Defer to v2. Start simple, version in git commits |
| Enforcement on all file types | "Consistency everywhere" | Waste effort on generated files, vendor code, config. High false positive rate | Ignore patterns (`.eslintignore` model). Focus on source code |

## Feature Dependencies

```
[Rule violation detection]
    └──requires──> [Rule definition format]
                       └──requires──> [Constitution file format]

[Violation reporting] ──requires──> [Rule violation detection]

[Override mechanism] ──requires──> [Enforcement point]
                         └──enhances──> [Audit trail logging]

[TDD commit pattern validation] ──requires──> [Git history access]
                                     └──requires──> [Test file detection]
                                     └──requires──> [Diff analysis]

[Contextual explanations] ──enhances──> [Violation reporting]

[Multi-level constitution] ──requires──> [Constitution merge logic]
                               └──conflicts──> [Single source of truth]

[Automated lint at verification] ──requires──> [Phase completion detection]
                                      └──requires──> [Codebase analysis tools]
```

### Dependency Notes

- **Rule violation detection requires rule definition format:** Can't enforce what isn't defined. Constitution.md must have parseable structure
- **TDD commit pattern validation requires git history access:** Must parse commit sequence, identify test-first pattern. Requires git log parsing
- **Multi-level constitution conflicts with single source of truth:** Hybrid model (global + project) means rules can contradict. Need merge strategy (project overrides global)
- **Override mechanism enhances audit trail:** Every override should log: who, when, which rule, why. Enables retroactive compliance review

## MVP Definition

### Launch With (v1)

Minimum viable enforcement — what's needed to validate the concept.

- [x] Constitution file format (markdown with NON-NEGOTIABLE markers) — Essential for rule codification
- [x] Rule violation detection for TDD commit patterns — Core value proposition, prevents highest-frequency violation
- [x] Error-level enforcement with user override — Table stakes blocking mechanism with escape hatch
- [x] Clear violation messages with rule explanation — Without context, enforcement creates friction
- [x] Pre-commit hook or verification phase integration — Need enforcement point to validate rules
- [ ] Global + project constitution merge logic — Required for hybrid model, enables base rules + overrides

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] Automated lints for anti-patterns from CONSTITUTION.md — When specific anti-patterns are documented and repeating
- [ ] Violation fingerprinting to detect new vs existing issues — When warning fatigue becomes problem
- [ ] Must-haves validation from plan frontmatter — When plan structure is stable and pattern is proven
- [ ] Audit trail for all overrides with rationale — When compliance reporting becomes requirement

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] One-click fixes for common violations — After violation patterns are well-understood
- [ ] Constitution versioning with migration tooling — After constitution format is stable
- [ ] Real-time IDE integration — After CLI enforcement proves value
- [ ] Convention catalog/hub (SpecKit Issue #366 pattern) — After multiple projects share constitutions

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| TDD commit pattern validation | HIGH | HIGH | P1 |
| Error-level enforcement + override | HIGH | LOW | P1 |
| Violation reporting with context | HIGH | MEDIUM | P1 |
| Global + project constitution | HIGH | MEDIUM | P1 |
| NON-NEGOTIABLE principle marking | MEDIUM | LOW | P1 |
| Automated anti-pattern lints | MEDIUM | HIGH | P2 |
| Violation fingerprinting | MEDIUM | HIGH | P2 |
| Must-haves validation | MEDIUM | MEDIUM | P2 |
| Audit trail logging | LOW | MEDIUM | P2 |
| One-click fixes | MEDIUM | HIGH | P3 |
| Constitution versioning | LOW | HIGH | P3 |
| IDE integration | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch (enables core TDD enforcement)
- P2: Should have, add when possible (expands enforcement scope)
- P3: Nice to have, future consideration (polish + ecosystem)

## Competitor Feature Analysis

| Feature | SpecKit | ESLint | Pre-commit | OPA/Gatekeeper | GSD Constitutional |
|---------|---------|--------|------------|----------------|-------------------|
| Rule definition | Constitution.md NON-NEGOTIABLE markers | .eslintrc.js severity levels | .pre-commit-config.yaml hooks | Rego policies as CRDs | Global + project CONSTITUTION.md |
| Enforcement point | Phase -1 gate + analyze command | Pre-commit hook or CI | Git hooks (pre-commit, commit-msg) | Kubernetes admission control | Verification phase + pre-commit |
| Violation reporting | CRITICAL findings in analyze output | Structured ESLint format with line numbers | Hook failure messages | Deny set with violation messages | Error messages with "why it fails" |
| Severity levels | NON-NEGOTIABLE vs guidance | off/warn/error | Pass/fail hooks | Advisory/Soft-Mandatory/Hard-Mandatory | NON-NEGOTIABLE/error/warning |
| Override mechanism | Constitutional amendments (versioned) | Inline comments (eslint-disable) | --no-verify flag | Soft-Mandatory can be overridden with permissions | --no-verify + logged rationale |
| Context/rationale | Article system explains WHY | Rule documentation URLs | Hook README | Policy documentation in git | Anti-pattern docs with failure explanation |
| Our approach | Hybrid: SpecKit philosophy + enforcement flexibility | Error-level blocking with override, TDD-specific patterns, verification-phase validation | Git hooks for pre-commit, verification agent for post-execution | Policy-as-code principles applied to development workflow | Multi-level constitution, TDD commit validation, contextual violation reporting |

## Sources

**Constitutional Enforcement Systems:**
- [SpecKit Constitution Command - DeepWiki](https://deepwiki.com/github/spec-kit/4.2-speckit.constitution-command)
- [Beyond Vibe Coding: SpecKit Constitutional Enforcement - Medium](https://medium.com/@mcraddock/beyond-vibe-coding-spec-kit-and-the-constitution-for-consistent-gds-compliant-ai-development-e4b2693a241f)
- [SpecKit Analyze Command - DeepWiki](https://deepwiki.com/github/spec-kit/4.6-constitution-system)

**Git Hooks Enforcement:**
- [Pre-commit Framework](https://pre-commit.com/)
- [Effortless Code Quality: Pre-Commit Hooks Guide 2025 - Medium](https://gatlenculp.medium.com/effortless-code-quality-the-ultimate-pre-commit-hooks-guide-for-2025-57ca501d9835)
- [Git Hooks for Automated Code Quality Checks 2025 - DEV](https://dev.to/arasosman/git-hooks-for-automated-code-quality-checks-guide-2025-372f)

**Policy as Code:**
- [Open Policy Agent Documentation](https://www.openpolicyagent.org/docs/latest/)
- [Enabling Policy as Code with OPA and Rego - Snyk](https://snyk.io/blog/opa-rego-usage-for-policy-as-code/)
- [Enforcing Policy as Code in Terraform - Scalr](https://scalr.com/learning-center/enforcing-policy-as-code-in-terraform-a-comprehensive-guide/)

**ESLint Enforcement:**
- [Configure Rules - ESLint](https://eslint.org/docs/latest/use/configure/rules)
- [Introducing Bulk Suppressions - ESLint](https://eslint.org/blog/2025/04/introducing-bulk-suppressions/)
- [ESLint Warnings Are an Anti-Pattern - DEV](https://dev.to/thawkin3/eslint-warnings-are-an-anti-pattern-33np/comments)

**TDD Commit Patterns:**
- [TDD-BDD-Commit Tool - GitHub](https://github.com/matatk/tdd-bdd-commit)
- [Git Hooks for Automated Code Quality Checks 2025 - DEV](https://dev.to/arasosman/git-hooks-for-automated-code-quality-checks-guide-2025-372f)

**Violation Reporting UX:**
- [Developer Experience of Linting - Qlty Blog](https://qlty.sh/blog/developer-experience-gaps-of-linting-on-ci)
- [If I Wrote a Linter Part 2: Developer Experience - Josh Goldberg](https://www.joshuakgoldberg.com/blog/if-i-wrote-a-linter-part-2-developer-experience/)

**Enforcement Level Patterns:**
- [Automated Code Review Blocking vs Warning - Wiz](https://www.wiz.io/academy/application-security/automated-code-review)
- [Code Review Automation Best Practices 2025 - Qodo](https://www.qodo.ai/blog/ai-code-reviews-enforce-compliance-coding-standards/)

**Escape Hatches:**
- [Escape Hatches - AWS PDK](https://aws.github.io/aws-pdk/developer_guides/monorepo/escape_hatches.html)
- [Managing GitHub Branch Protections - Medium](https://medium.com/@lauravuo/managing-github-branch-protections-4fa37b36ee4f)

---
*Feature research for: Constitutional enforcement systems in dev tools*
*Researched: 2026-01-18*
