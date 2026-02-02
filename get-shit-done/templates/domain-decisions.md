# Domain Decision Templates

Fallback templates for coverage tracking when no DISCUSSION-GUIDE.md exists from research.

**Purpose:** Provide expected decision areas by domain type so the discuss-phase workflow can:
1. Generate relevant gray areas
2. Track coverage during discussion
3. Recommend whether more questions are needed

**How to use:**
1. Identify domain type from phase description
2. Load corresponding decision template
3. Use as baseline for gray area generation and coverage tracking

---

## Visual Feature (UI)

Phases that create something users SEE — feeds, dashboards, forms, cards, etc.

**Key decisions:**
| Decision | What it covers | Coverage indicator |
|----------|----------------|-------------------|
| `layout-style` | Cards vs list vs grid vs timeline | User specified arrangement preference |
| `information-density` | Full content vs previews vs minimal | User specified density preference |
| `loading-pattern` | Infinite scroll vs pagination vs load-more | User chose loading behavior |
| `empty-state` | What shows when no content exists | User described empty experience |
| `error-state` | How errors are presented to users | User specified error handling UX |
| `interaction-style` | Click vs hover vs swipe behaviors | User chose interaction pattern |

**Gray area examples:**
- "Layout style — Cards vs list vs timeline? Information density?"
- "Loading behavior — Infinite scroll or pagination? Pull to refresh?"
- "Empty state — What shows when nothing exists yet?"

---

## API Endpoint

Phases that create something users CALL — REST endpoints, GraphQL queries, webhooks, etc.

**Key decisions:**
| Decision | What it covers | Coverage indicator |
|----------|----------------|-------------------|
| `response-format` | JSON structure, field naming, nesting | User specified response shape |
| `error-responses` | Error codes, messages, structure | User defined error contract |
| `authentication` | Auth method, token handling | User chose auth approach |
| `versioning` | URL vs header versioning strategy | User specified version approach |
| `rate-limiting` | Limits, headers, behavior when exceeded | User defined rate policy |
| `pagination` | Offset vs cursor, page size, metadata | User chose pagination style |

**Gray area examples:**
- "Response format — JSON structure? What fields in responses?"
- "Error handling — Error codes and messages? Retry guidance?"
- "Authentication — What auth is required? Token format?"

---

## CLI Tool

Phases that create something users RUN — command-line tools, scripts, etc.

**Key decisions:**
| Decision | What it covers | Coverage indicator |
|----------|----------------|-------------------|
| `output-format` | JSON vs table vs plain text, verbosity | User specified output style |
| `flag-design` | Short/long flags, required vs optional | User defined flag conventions |
| `progress-reporting` | Silent vs progress bar vs verbose | User chose feedback level |
| `error-recovery` | Fail fast vs retry vs prompt | User specified error behavior |
| `exit-codes` | What codes mean, CI compatibility | User defined exit semantics |
| `interactive-mode` | Prompts vs flags-only | User chose interaction model |

**Gray area examples:**
- "Output format — JSON, table, or plain text? Verbosity levels?"
- "Flag design — Short flags, long flags, or both? Required vs optional?"
- "Error recovery — Fail fast, retry, or prompt for action?"

---

## Documentation

Phases that create something users READ — docs, guides, READMEs, etc.

**Key decisions:**
| Decision | What it covers | Coverage indicator |
|----------|----------------|-------------------|
| `structure` | Hierarchy, navigation, organization | User specified doc structure |
| `tone` | Formal vs casual, technical level | User chose voice/tone |
| `examples-depth` | Minimal vs comprehensive examples | User defined example coverage |
| `versioning` | How versions are documented | User specified version docs |
| `interactive-elements` | Runnable examples, try-it widgets | User chose interactivity level |
| `search-discovery` | How users find content | User defined discovery UX |

**Gray area examples:**
- "Structure — How should docs be organized? Navigation style?"
- "Tone — Formal or casual? What technical level?"
- "Examples — Minimal snippets or comprehensive walkthroughs?"

---

## Organization Task

Phases that ORGANIZE existing things — file organization, migrations, refactors, etc.

**Key decisions:**
| Decision | What it covers | Coverage indicator |
|----------|----------------|-------------------|
| `grouping-criteria` | How items are grouped/categorized | User specified grouping logic |
| `naming-convention` | Naming patterns, formats | User defined naming rules |
| `duplicate-handling` | Keep, merge, or delete duplicates | User chose duplicate strategy |
| `exception-handling` | What to do with edge cases | User specified exception rules |
| `rollback-strategy` | How to undo if needed | User defined rollback approach |
| `validation` | How to verify success | User specified validation criteria |

**Gray area examples:**
- "Grouping criteria — By date, location, type, or something else?"
- "Duplicate handling — Keep best, keep all, or prompt each time?"
- "Naming convention — Original names, dates, or descriptive?"

---

## Data Processing

Phases that TRANSFORM data — ETL, pipelines, imports/exports, etc.

**Key decisions:**
| Decision | What it covers | Coverage indicator |
|----------|----------------|-------------------|
| `input-format` | Supported input formats, validation | User specified input handling |
| `output-format` | Output structure, encoding | User defined output format |
| `error-handling` | Skip vs fail vs quarantine bad records | User chose error strategy |
| `performance-mode` | Batch size, parallelism, streaming | User specified performance needs |
| `idempotency` | Re-run behavior, deduplication | User defined replay behavior |
| `logging-level` | What gets logged, where | User chose observability |

**Gray area examples:**
- "Error handling — Skip bad records, fail entirely, or quarantine?"
- "Performance — Batch processing or streaming? Parallelism?"
- "Idempotency — Safe to re-run? How to handle duplicates?"

---

## Integration

Phases that CONNECT systems — third-party APIs, webhooks, sync, etc.

**Key decisions:**
| Decision | What it covers | Coverage indicator |
|----------|----------------|-------------------|
| `sync-direction` | One-way vs two-way sync | User specified sync direction |
| `conflict-resolution` | Which system wins on conflict | User chose conflict strategy |
| `retry-policy` | Retry count, backoff, circuit breaker | User defined retry behavior |
| `data-mapping` | Field mapping, transformations | User specified mapping rules |
| `auth-storage` | Where/how credentials are stored | User chose credential handling |
| `webhook-handling` | Signature validation, retry handling | User defined webhook behavior |

**Gray area examples:**
- "Sync direction — One-way push, pull, or bidirectional?"
- "Conflict resolution — Which system is source of truth?"
- "Retry policy — How many retries? Exponential backoff?"

---

## Usage Notes

**Domain detection heuristics:**

Look for these signals in the phase description:

| Domain | Signals |
|--------|---------|
| Visual Feature | "display", "show", "UI", "page", "component", "feed", "dashboard" |
| API Endpoint | "API", "endpoint", "REST", "GraphQL", "request", "response" |
| CLI Tool | "CLI", "command", "terminal", "script", "tool" |
| Documentation | "docs", "documentation", "guide", "README", "tutorial" |
| Organization | "organize", "structure", "migrate", "refactor", "clean up" |
| Data Processing | "import", "export", "ETL", "pipeline", "transform", "process" |
| Integration | "integrate", "sync", "connect", "webhook", "third-party" |

**Fallback:** If domain is unclear, use Visual Feature as default (most common).

**Coverage calculation:**
```python
coverage_ratio = len(decisions_locked) / len(domain_template_decisions)

if coverage_ratio >= 0.8:
    recommendation = "covered_well"
elif coverage_ratio >= 0.5:
    recommendation = "optional_more"
else:
    recommendation = "suggest_more"
```
