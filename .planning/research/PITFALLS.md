# Pitfalls Research

**Domain:** Constitutional Enforcement for Developer Tools
**Researched:** 2026-01-18
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: False Positive Death Spiral

**What goes wrong:**
High false positive rates (>25% for critical rules) erode developer trust, leading to wholesale disable comments (`/* eslint-disable */`), which defeats enforcement entirely. Developers learn to ignore all warnings, including real issues.

**Why it happens:**
- Rules applied retroactively without context awareness
- Over-strict enforcement on legacy code written before rules existed
- Configuration that extends `eslint:all` or similar "kitchen sink" rulesets
- Rules that flag stylistic preferences as errors

**How to avoid:**
- Target <25% false positive rate for critical rules, <50% for high severity
- Start with HIGH confidence rules only (proven patterns, not opinions)
- Use progressive enforcement: warn-only mode → error mode over time
- Require justification comments for disable directives
- Monitor disable directive usage as metric of rule quality

**Warning signs:**
- >10% of files have `eslint-disable` comments
- Developers asking "how do I turn this off?" within first week
- Pull request discussions focus on "how to bypass" not "how to fix"
- Enforcement tool mentioned negatively in retros

**Phase to address:**
Phase 1 (Foundation) - Build progressive enforcement mechanism from start
Phase 2 (Validation) - Measure false positive rate before expanding rules

---

### Pitfall 2: Pre-Commit Hook Breaking TDD Workflows

**What goes wrong:**
Enforcement at pre-commit blocks developers from saving work-in-progress. Engineers practicing TDD with frequent commits (every 5-10 minutes) face 2+ minute wait times per commit, breaking flow state. Teams abandon hooks entirely.

**Why it happens:**
- Assumption that "commit = production ready" (not true for TDD, feature branches)
- Running full validation suite on every commit
- Not distinguishing between "save checkpoint" vs "merge to main"
- Hooks run on working tree instead of staged index

**How to avoid:**
- Use pre-push hooks instead of pre-commit (defers validation)
- Provide explicit bypass flag: `git commit --no-verify` with tracking
- Run enforcement in CI/CD as required check (mandatory gate)
- Keep pre-commit checks under 10 seconds or make them optional
- Document: "Hooks are helpers, CI is enforcer"

**Warning signs:**
- Developers routinely use `--no-verify` flag
- Complaints about "git is slow now"
- Commits become infrequent and large (batching to avoid pain)
- Rebase workflows broken or abandoned

**Phase to address:**
Phase 1 (Foundation) - Design for CI enforcement, not local hooks
Phase 3 (Integration) - Optional local hooks as DX enhancement only

---

### Pitfall 3: Retroactive Application Breaking Existing Projects

**What goes wrong:**
Applying new constitutional rules to 50+ existing GSD projects generates thousands of violations overnight. Projects that worked yesterday fail today. Engineers lose trust in tool stability.

**Why it happens:**
- No grandfather clause for pre-existing code
- All-or-nothing enforcement (no warn mode)
- No migration guide for fixing violations
- Breaking changes shipped without communication

**How to avoid:**
- Version constitutions: `constitution_version: 1` in PROJECT.md
- New rules apply only to projects that opt-in or update version
- Provide migration tool: `gsd constitution migrate` with auto-fix
- Warn-only mode for 1 sprint before error mode
- Generate violation report with fix suggestions

**Warning signs:**
- Support requests spike after constitution update
- "It worked yesterday" bug reports
- Projects pin to old GSD version to avoid enforcement
- Forks created to remove enforcement

**Phase to address:**
Phase 1 (Foundation) - Constitution versioning system
Phase 4 (Migration) - Backward compatibility mechanism

---

### Pitfall 4: Override Mechanism Abuse

**What goes wrong:**
Providing override mechanism (`# gsd-disable: rule-name`) leads to overuse. Within months, 40%+ of violations have disable comments, making enforcement meaningless.

**Why it happens:**
- No audit trail for why override used
- No approval required for override
- No reporting on override usage
- Easier to disable than fix

**How to avoid:**
- Require justification: `# gsd-disable: rule-name | reason: legacy API contract`
- Track metrics: % of rules with overrides, trend over time
- Report in `gsd status`: "12 active overrides (up from 8 last week)"
- Alert if override % exceeds threshold (suggest rule retirement)
- Consider time-bounded overrides: `# gsd-disable-until: 2026-03-01`

**Warning signs:**
- >20% of rule violations have disable comments
- Same rule disabled across multiple files (rule is wrong)
- Disable comments outnumber enforcement in diffs
- Generic reasons: "doesn't apply here" without specifics

**Phase to address:**
Phase 1 (Foundation) - Override mechanism with required justification
Phase 2 (Validation) - Override metrics and reporting

---

### Pitfall 5: Configuration Scope Blindness

**What goes wrong:**
Assuming global-only configuration means team-level constitution can't exist. GSD projects at Amazon vs Shopify have different needs, but enforcement is one-size-fits-all. Teams work around with hacky overrides.

**Why it happens:**
- Not researching all configuration scopes (global, team, project, local)
- Implementing simplest scope first, never adding others
- Assuming complexity isn't worth it

**How to avoid:**
- Design multi-level config from start: global → team → project → local
- Each level inherits and overrides parent
- Document precedence clearly
- Provide `gsd config show --effective` to debug merged config

**Warning signs:**
- Feature requests for "per-team rules"
- Projects disabling large chunks of global rules
- Forked constitution files copied between projects
- "This rule doesn't make sense for our stack" feedback

**Phase to address:**
Phase 1 (Foundation) - Multi-level configuration hierarchy

---

### Pitfall 6: Under-Enforcement (Toothless Rules)

**What goes wrong:**
Rules exist but have no consequences. Constitution says "must have tests" but projects ship without tests because there's no gate. Rules become documentation that nobody reads.

**Why it happens:**
- Warn-only mode never graduates to error mode
- CI check exists but isn't required for merge
- Override mechanism too easy, no review required
- Fear of breaking existing workflows leads to infinite deferral

**How to avoid:**
- Phase enforcement: 2 sprints warn → error with auto-fix → error blocking
- Make CI check required after warn period
- Executive sponsor commitment: "These rules will block merges on [date]"
- Measure compliance weekly, share publicly
- Start with 3 high-value rules, not 30 nice-to-haves

**Warning signs:**
- Compliance <60% after 3 months
- "Optional" or "recommended" language in documentation
- CI check fails but PRs merge anyway
- Rules added but never enforced

**Phase to address:**
Phase 2 (Validation) - Graduated enforcement mechanism
Phase 3 (Integration) - Required CI checks

---

### Pitfall 7: Over-Enforcement (Too Strict)

**What goes wrong:**
Every minor preference encoded as hard error. 100+ rules enforced from day 1. Developers spend more time appeasing linter than shipping features. Productivity craters, morale follows.

**Why it happens:**
- "More rules = better code quality" fallacy
- Copy-pasting comprehensive configs without curation
- Not distinguishing critical vs nice-to-have
- Stakeholders want "best practices" without cost awareness

**How to avoid:**
- Start with <10 critical rules (security, breaking changes, data loss)
- Require business case for each rule: "What problem does this prevent?"
- Categorize: ERROR (must fix), WARN (should fix), INFO (consider)
- Sunset underutilized rules quarterly
- Developer vote: if >50% want rule removed, remove it

**Warning signs:**
- Developers complaining about "fighting the tools"
- PRs with 90% linter fixes, 10% actual feature code
- "Linter says" becomes punchline in team chat
- Velocity drops >20% after enforcement added

**Phase to address:**
Phase 1 (Foundation) - Rule severity classification
Phase 2 (Validation) - Rule effectiveness metrics

---

### Pitfall 8: No Escape Hatch for Emergencies

**What goes wrong:**
Production is down. Fix requires violating constitution rule. No way to bypass. Incident extends by hours while debating whether to disable enforcement entirely.

**Why it happens:**
- No documented emergency override process
- All overrides require same approval (no fast path)
- Fear that escape hatch will be abused

**How to avoid:**
- Document emergency override: `gsd commit --emergency "reason"`
- Creates ticket automatically for post-incident cleanup
- Requires incident number or link
- Logs all emergency overrides for audit
- Monthly review of emergency override usage

**Warning signs:**
- Enforcement disabled globally during incidents
- "Just push to main" as incident response
- Policies quietly ignored under pressure
- No record of why rules were bypassed

**Phase to address:**
Phase 3 (Integration) - Emergency override mechanism
Phase 4 (Migration) - Audit and review process

---

### Pitfall 9: Enforcement Without Education

**What goes wrong:**
Rules appear overnight with cryptic error messages. Developers don't understand why rule exists or how to fix violations. Frustration builds, rules seen as arbitrary bureaucracy.

**Why it happens:**
- Focus on technical implementation, not change management
- Assuming rules are self-explanatory
- No time allocated for training
- Error messages focus on "what's wrong" not "why it matters"

**How to avoid:**
- Each rule has documentation: rationale, examples, fix guide
- Error messages link to docs: "See: gsd.dev/rules/no-missing-tests"
- Announce new rules 2 weeks before enforcement
- Office hours: "Constitution Q&A" session
- Champions program: early adopters help others

**Warning signs:**
- Same questions repeated in Slack
- Developers fixing symptom but not root cause
- "I don't understand why this rule exists" feedback
- Compliance through copy-paste without understanding

**Phase to address:**
Phase 2 (Validation) - Documentation and training materials
Phase 3 (Integration) - Change management plan

---

### Pitfall 10: Zero-Dependency Philosophy Conflict

**What goes wrong:**
GSD's zero-dependency philosophy conflicts with enforcement needs. Adding linting library or parser breaks philosophy. Solution becomes worse than problem.

**Why it happens:**
- Enforcement tools inherently complex (parsing, AST analysis)
- "Just add this npm package" violates core principle
- Building from scratch is months of work
- Compromise weakens both enforcement and philosophy

**How to avoid:**
- Enforce through structure, not parsing: Convention over validation
- Use Git hooks for shell-based checks (zero deps)
- Delegate complex validation to CI where deps acceptable
- Document tradeoff: "Local enforcement = simple, CI enforcement = thorough"
- Focus on enforcing outcomes, not implementation

**Warning signs:**
- Feature requests require adding dependency
- Enforcement only works "if you install X"
- Local and CI enforcement diverge significantly
- Philosophy exceptions accumulating

**Phase to address:**
Phase 1 (Foundation) - Enforce through convention and structure
Phase 3 (Integration) - CI-based complex validation as optional layer

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Warn-only mode indefinitely | No workflow disruption | Rules never enforced, violations accumulate | First 2 sprints only, then must graduate to errors |
| Global disable comments | Quick unblock for urgent work | Violations persist, trust erodes | Emergency only with tracking ticket |
| Copy config from another tool | Fast setup, proven rules | Rules don't match your context, high false positives | Never - always curate for your domain |
| Skip migration tooling | Ship enforcement faster | Existing projects can't adopt, fragmentation | Only if <5 existing projects |
| Manual override approval | Thoughtful case-by-case review | Bottleneck, slow emergency response | Post-facto review, not pre-approval |
| Single global config | Simplest implementation | Doesn't scale across teams/stacks | MVP only, add hierarchy by Phase 2 |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Git hooks | Installing automatically | Provide setup script, document in README, let developers opt-in |
| CI/CD | Running all checks in serial | Parallel execution, fail fast on critical rules first |
| Editor plugins | Assuming everyone uses same editor | Provide LSP-compatible validation, editor-agnostic |
| Existing linters (ESLint) | Duplicating rules in constitution | Constitution defines policy, delegate implementation to ESLint |
| Version control | Enforcement outside Git commits | Validate at commit/push time when developer has context |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Full codebase scan on every commit | Commits take >30 seconds | Scan only changed files, cache results | >1000 files in repo |
| Complex regex in shell scripts | CPU spikes, timeout errors | Delegate complex parsing to CI, keep local checks simple | >100 files to validate |
| No caching of validation results | Re-checking unchanged files | Hash-based cache, invalidate on rule changes | >50 files to validate |
| Synchronous enforcement | Blocking on external API calls | Async validation, show results after commit | Any external dependency |
| Parsing entire file for single-line check | Validation takes minutes | Line-by-line streaming where possible | >10MB files |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Enforcement config in user-editable location | Developers disable rules by editing config | Config in protected location or signed/hashed |
| No audit trail for overrides | Can't detect systematic rule avoidance | Log all overrides to centralized system |
| Secrets in constitution files | Constitution files committed to public repos | Lint constitution files themselves, no hardcoded values |
| Allowing arbitrary shell execution | `gsd hook run` executes untrusted code | Sandboxed execution or curated command allowlist |
| No validation of constitution format | Malformed config disables all enforcement | Schema validation on load, fail safe = strictest |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Cryptic error messages | Developers can't fix violations | Include: what's wrong, why it matters, how to fix, where to learn more |
| No progress indication | Validation appears frozen | Show: "Checking rule 3/10...", streaming results |
| Errors at wrong time | Finding out at PR review, not commit | Validate at commit time, surface in editor if possible |
| No bulk fix option | Fixing 100 violations one-by-one | `gsd constitution fix --auto` for automatable rules |
| Success is silent | No positive reinforcement | "✓ All constitutional rules passed" builds good habits |
| No differentiation of severity | Every issue looks equally important | Visual hierarchy: 🔴 ERROR, 🟡 WARNING, 🔵 INFO |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Override mechanism:** Often missing audit logging — verify overrides are tracked
- [ ] **Error messages:** Often missing fix guidance — verify each rule has "How to fix" docs
- [ ] **Backward compatibility:** Often missing version negotiation — verify old projects can opt-out
- [ ] **Progressive enforcement:** Often missing warn→error graduation — verify timeline exists
- [ ] **Performance:** Often missing caching — verify validation doesn't re-check unchanged files
- [ ] **Emergency bypass:** Often missing fast path — verify incident response isn't blocked
- [ ] **Metrics collection:** Often missing override tracking — verify can answer "Is this rule effective?"
- [ ] **Multi-level config:** Often missing team/project overrides — verify not just global config
- [ ] **Rule retirement:** Often missing sunset process — verify can remove ineffective rules
- [ ] **Change communication:** Often missing announcement process — verify developers learn about new rules before they're enforced

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| False positive death spiral | MEDIUM | 1. Pause enforcement (warn mode) 2. Survey developers for top pain points 3. Retire worst 3 rules 4. Improve error messages 5. Re-enable after 1 sprint |
| Pre-commit breaking TDD | LOW | 1. Move checks to pre-push 2. Make pre-commit opt-in 3. Document bypass flag 4. Enforce in CI as required check |
| Retroactive breaks existing projects | HIGH | 1. Add constitution versioning 2. Grandfather existing projects at v0 3. Provide migration tool 4. Offer office hours for migration help |
| Override abuse | MEDIUM | 1. Add override metrics to dashboard 2. Require justification retroactively 3. Review rules with >30% override rate for retirement |
| No emergency escape hatch | LOW | 1. Document `--emergency` flag 2. Create auto-ticket on emergency use 3. Communicate to all engineers |
| Under-enforcement | MEDIUM | 1. Set graduation date 2. Weekly compliance dashboard 3. Executive sponsor announcement 4. Enforce on new code first |
| Over-enforcement | MEDIUM | 1. Developer survey on rule value 2. Demote 50% of rules to WARN 3. Retire bottom 25% by vote 4. Sunset process for future rules |
| Zero-dependency conflict | HIGH | 1. Reframe as "convention over validation" 2. Move complex checks to CI 3. Keep local checks structural only |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| False positive death spiral | Phase 1 (Foundation) | Monitor false positive rate <25%, developer survey shows >70% satisfaction |
| Pre-commit breaking TDD | Phase 1 (Foundation) | Enforcement in CI not pre-commit, optional local hooks under 10s |
| Retroactive breaks existing | Phase 1 (Foundation) | Constitution versioning exists, migration tool provided |
| Override abuse | Phase 2 (Validation) | Override metrics tracked, <20% of violations have overrides |
| Configuration scope blindness | Phase 1 (Foundation) | Multi-level config (global/team/project/local) implemented |
| Under-enforcement | Phase 2 (Validation) | Graduated enforcement timeline defined, compliance >80% |
| Over-enforcement | Phase 2 (Validation) | Start with <10 rules, developer vote mechanism exists |
| No emergency escape hatch | Phase 3 (Integration) | Emergency override documented, incident response tested |
| Enforcement without education | Phase 2 (Validation) | Each rule has docs with rationale and fix guide |
| Zero-dependency conflict | Phase 1 (Foundation) | Local enforcement uses only shell/git, complex checks in CI |

## Sources

**Linter Trust & False Positives:**
- [Why You Don't Trust Your Linter - GOTO Conferences](https://www.classcentral.com/course/youtube-why-you-don-t-trust-your-linter-jeroen-engels-goto-2022-193421)
- [Why developers hate linters - CodeRabbit](https://www.coderabbit.ai/blog/why-developers-hate-linters)
- [Breaking Down False Positives in Secrets Scanning - Checkmarx](https://checkmarx.com/learn/breaking-down-false-positives-in-secrets-scanning/)
- [Fixing the Vulnerability That Wasn't - Invicti](https://www.invicti.com/blog/web-security/fixing-vulnerability-of-false-positives-before-dev-team-cisos-corner)

**Pre-commit Hook Problems:**
- [Pre-commit hooks are fundamentally broken - jyn.dev](https://jyn.dev/pre-commit-hooks-are-fundamentally-broken/)
- [Pre-commit hooks are broken - Hacker News](https://news.ycombinator.com/item?id=46398906)
- [Pre-commit: Don't git hooked! - Thoughtworks](https://www.thoughtworks.com/insights/blog/pre-commit-don-t-git-hooked)

**Policy as Code Failures:**
- [Why the Policy-as-Code revolution didn't happen - GRC Engineer](https://grcengineer.com/p/why-the-policy-as-code-revolution-didn-t-happen-and-what-can-we-do)
- [Policy as Code Is Not Enough - Secberus](https://www.secberus.com/articles/policy-as-code-is-not-enough-why-governance-needs-policy-as-context)
- [CPRA Enforcement 2025 Lessons - CookieScript](https://cookie-script.com/privacy-laws/cpra-enforcement-2025-lessons-and-expectations-2)

**ESLint Configuration Issues:**
- [Evolving flat config with extends - ESLint](https://eslint.org/blog/2025/03/flat-config-extends-define-config-global-ignores/)
- [How I dealt with over 30,000 ESLint errors - Plain English](https://plainenglish.io/blog/how-i-dealt-with-over-30-000-eslint-errors)
- [Configuration Files - ESLint](https://eslint.org/docs/latest/use/configure/configuration-files)

**Override Mechanisms:**
- [Turn off ESLint Rules - Tim Santeford](https://www.timsanteford.com/posts/turn-off-eslint-rules-a-guide-to-disabling-eslint-sparingly/)
- [Configure Rules - ESLint](https://eslint.org/docs/latest/use/configure/rules)
- [How to Make Linting Rules Work: From Enforcement to Education - Agoda Engineering](https://medium.com/agoda-engineering/how-to-make-linting-rules-work-from-enforcement-to-education-be7071d2fcf0)

**Progressive Enforcement:**
- [How to Use Linters for Enforcing Code Standards - Pixel Free Studio](https://blog.pixelfreestudio.com/how-to-use-linters-for-enforcing-code-standards/)
- [Flat config rollout plans - ESLint](https://eslint.org/blog/2023/10/flat-config-rollout-plans/)
- [Progressive rollouts - LaunchDarkly](https://launchdarkly.com/docs/home/releases/progressive-rollouts)

**Backward Compatibility:**
- [Automated Backward Compatibility Testing - Ankush Choubey](https://www.ankushchoubey.com/software-blog/backward-compatibility-ci/)
- [Ensuring backwards compatibility in distributed systems - Stack Overflow](https://stackoverflow.blog/2020/05/13/ensuring-backwards-compatibility-in-distributed-systems/)
- [Our Backward Compatibility Promise - Symfony](https://symfony.com/doc/current/contributing/code/bc.html)

**Finding Balance:**
- [6 things developer tools must have in 2026 - Evil Martians](https://evilmartians.com/chronicles/six-things-developer-tools-must-have-to-earn-trust-and-adoption)
- [Best Practices of Authorizing AI Agents - Oso](https://www.osohq.com/learn/best-practices-of-authorizing-ai-agents)
- [Rate Limiting in APIs - Code by Zeba Academy](https://code.zeba.academy/rate-limiting-in-apis/)

**Minimal Dependency Philosophy:**
- [Oxlint v1.0 Stable Released - InfoQ](https://www.infoq.com/news/2025/08/oxlint-v1-released/)
- [Design Philosophy of Zero-Dependency Web Framework - French Intelligence](https://22.frenchintelligence.org/2025/07/23/design-philosophy-of-zero-dependency-web-framework3886/)
- [Building Architecture with Minimal Dependencies - Palos Publishing](https://palospublishing.com/building-architecture-with-minimal-dependencies/)
- [Design Principle: Minimize Dependencies - Sleeping Potato](https://sleepingpotato.com/design-principle-minimize-dependencies/)

**Metrics & Effectiveness:**
- [False Positive Rate - Harness](https://www.harness.io/harness-devops-academy/false-positive-rate)
- [SOC Metrics that Matter - Prophet Security](https://www.prophetsecurity.ai/blog/soc-metrics-that-matter-mttr-mtti-false-negatives-and-more)
- [True positive rate importance - Statsig](https://www.statsig.com/perspectives/true-positive-rate-importance-testing)

---
*Pitfalls research for: Constitutional Enforcement in Developer Tools*
*Researched: 2026-01-18*
