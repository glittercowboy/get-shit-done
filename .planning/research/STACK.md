# Technology Stack Research

**Project:** GSD Enhancements v2.0
**Domain:** AI Development Framework - Local Vector Database, Embedding Models, Token/Cost Tracking
**Researched:** 2026-02-15
**Confidence:** HIGH

## Recommended Stack

### Vector Database

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vectra | Latest (584 stars, active) | Local file-backed vector database for Node.js | Git-friendly JSON format, zero infrastructure, <1ms lookups, portable language-agnostic structure. Perfect for GSD's local-first constraint. |
| zvec (Alternative) | v0.2.0 (Feb 2026) | High-performance embedded vector database | 8000+ QPS (2x faster than alternatives), dense+sparse support, hybrid search. Pre-1.0 version suggests active development risk. Consider for Phase 2 if performance bottlenecks emerge. |

**Recommendation:** Use Vectra for initial implementation. It's mature, git-friendly (JSON storage), and perfectly matches the "single file or small folder" constraint. zvec is impressive but too new (v0.2.0) for production use.

### Embedding Models

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Transformers.js | v3.8.1 (stable) / v4.0 preview | Browser & Node.js ML inference with ONNX | Fully offline, WebGPU acceleration, 200+ model architectures. v4 preview available on NPM under `@huggingface/transformers@next` with full offline support via WASM caching. |
| nomic-embed-text-v1.5 | v1.5 | Text embeddings (768d, 8192 context) | Best-in-class open-source embeddings, ONNX-compatible, Transformers.js support via Xenova/nomic-embed-text-v1.5. Multilingual, long context window perfect for code/documentation. |
| Ollama (Alternative) | Latest | Local model runtime with embedding support | Requires separate daemon (breaks "zero infrastructure" goal). Use only if user already runs Ollama. Otherwise, Transformers.js is superior for embedded use case. |

**Recommendation:** Transformers.js v3.8.1 with nomic-embed-text-v1.5 (ONNX). Fully offline, git-trackable model files, zero external dependencies. v4 preview shows promise but wait for stable release.

### Token/Cost Tracking

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| gpt-tokenizer | v3.4.0 | Tiktoken port with cost estimation | Fastest tokenizer on NPM (since v2.4.0), supports all OpenAI encodings (r50k, p50k, cl100k, o200k), built-in `estimateCost` function. |
| LiteLLM | Latest | Multi-provider cost calculation | Supports 200+ providers via `completion_cost()` function, live pricing from api.litellm.ai, custom model pricing support. Essential for multi-model Auto Mode. |
| Langfuse (Optional) | Latest (self-hosted) | Comprehensive LLM observability | Open-source, self-hosted option available, tracks usage across 50+ integrations (OpenAI, Anthropic, LangChain), custom model definitions for fine-tuned models. Overkill for initial implementation but valuable for advanced analytics. |

**Recommendation:** Start with gpt-tokenizer + LiteLLM. gpt-tokenizer handles OpenAI models (primary use case), LiteLLM covers Anthropic/Google/others. Defer Langfuse until analytics requirements emerge.

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| RxDB + Transformers.js | Latest | Browser-based vector database | Only if browser extension planned. GSD is CLI-first, Vectra is better fit. |
| gpt-tokens | v1.3.14 | Token counting with USD cost estimation | Alternative to gpt-tokenizer if simpler API preferred. Less feature-complete. |
| @deepracticex/token-calculator | Latest | Token cost calculator | Unverified package, prefer gpt-tokenizer for production. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Node.js | Runtime environment | Already in use (v22.17.0 in current environment). Vectra requires Node 16+. |
| npm | Package management | Already in use (v10.9.2). No additional tooling needed. |
| esbuild | Bundler (already in use) | Continue using for hook compilation. No changes needed. |

## Installation

```bash
# Vector Database
npm install vectra

# Embedding Models (Transformers.js stable)
npm install @xenova/transformers

# Embedding Models (Transformers.js v4 preview - OPTIONAL)
npm install @huggingface/transformers@next

# Token/Cost Tracking
npm install gpt-tokenizer
npm install litellm  # Python package, requires Python integration or API calls

# Alternative: Pure Node.js cost tracking
npm install gpt-tokens
```

## Alternatives Considered

| Category | Recommended | Alternative | When to Use Alternative |
|----------|-------------|-------------|-------------------------|
| Vector DB | Vectra | zvec | When performance >8000 QPS required AND willing to accept pre-1.0 stability risk. Wait for v1.0. |
| Vector DB | Vectra | RxDB + Transformers.js | If building browser extension instead of CLI tool. Not relevant for GSD. |
| Embeddings | Transformers.js | Ollama | If user already runs Ollama daemon. Otherwise, Transformers.js is simpler (no daemon). |
| Embeddings | nomic-embed-text-v1.5 | all-MiniLM-L6-v2 | If 384d embeddings sufficient (smaller, faster). nomic-embed is better for code/docs (768d, 8192 context). |
| Tokenizer | gpt-tokenizer | tiktoken (Python) | Never. gpt-tokenizer is faster and native Node.js. |
| Cost Tracking | LiteLLM | Langfuse | If need full observability suite with dashboards. Defer until analytics needed. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Cloud vector DBs (Pinecone, Weaviate Cloud) | Violates local-first constraint, requires API keys, not git-friendly | Vectra (local files) |
| SQLite for vectors | Binary format not git-friendly, no native vector similarity search | Vectra (JSON + vector search) |
| Chromadb (Python) | Requires Python runtime, not native Node.js | Vectra or zvec |
| Milvus | Overkill, requires Docker/server, not git-friendly | Vectra (embedded) |
| gpt3-tokenizer / gpt4-tokenizer | Outdated, slower than gpt-tokenizer | gpt-tokenizer v3.4.0+ |
| Separate embedding API services | Breaks offline requirement, costs money, latency | Transformers.js (local ONNX) |

## Stack Patterns by Feature

### Target 1: Auto Mode (Smart Model Selection)

**Stack:**
- gpt-tokenizer for token counting (input analysis)
- LiteLLM for cost calculation (model comparison)
- Custom complexity detection algorithm (keywords + AST analysis)

**Pattern:**
```javascript
const tokenCount = encode(input).length;
const cost = await litellm.completion_cost({
  model: 'claude-opus-4.5',
  tokens: { prompt: tokenCount, completion: estimatedOutput }
});
// Route to Haiku/Sonnet/Opus based on complexity + cost threshold
```

### Target 2: Autonomous Roadmap Execution

**Stack:**
- Existing GSD orchestration (no new dependencies)
- Token tracking via gpt-tokenizer + LiteLLM
- Session/quota tracking in `.planning/session/`

**Pattern:**
- Spawn sub-coordinators with fresh context per phase
- Track cumulative token usage in `EXECUTION_LOG.md`
- Fail fast if quota exceeded

### Target 3: Knowledge System ("Principles")

**Stack:**
- Vectra for vector storage (two instances: global + project)
- Transformers.js + nomic-embed-text-v1.5 for embeddings
- JSON metadata storage (user ID, timestamp, confidence scores)

**Pattern:**
```javascript
// Global knowledge: ~/.claude/knowledge/vectors/
// Project knowledge: .planning/knowledge/vectors/
const globalIndex = new LocalIndex('./knowledge/vectors/global');
const projectIndex = new LocalIndex('./.planning/knowledge/vectors/project');

// Extract principle during GSD flow
const embedding = await pipeline('feature-extraction', 'Xenova/nomic-embed-text-v1.5');
const vector = await embedding(principleText);
await globalIndex.insertItem({ vector, metadata: { user, timestamp, context } });
```

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Vectra | Node.js 16+ | No conflicts with existing GSD stack (zero prod dependencies). |
| @xenova/transformers v3.8.1 | Node.js 16+, modern browsers | WASM binaries platform-agnostic. v4 preview requires Node 18+. |
| gpt-tokenizer v3.4.0 | Node.js 14+ | Works with all OpenAI models (GPT-3.5, GPT-4, GPT-5, o-series). |
| LiteLLM | Python 3.8+ | Requires Python integration OR REST API calls. Consider REST API for Node.js usage. |

## Git-Friendliness Analysis

| Technology | Storage Format | Git-Friendly? | Merge Strategy |
|------------|---------------|---------------|----------------|
| Vectra | JSON (index.json + per-item .json files) | YES | Text-based diffs work. Merge conflicts unlikely (append-only for principles). |
| zvec | Binary database file | NO | Binary blob, no meaningful diffs. Would require custom merge tools. |
| Transformers.js models | ONNX binary + JSON config | PARTIAL | Models are large binaries (git-lfs recommended). Config files are JSON (mergeable). |
| nomic-embed ONNX | ~300MB binary | NO (use git-lfs) | Model weights don't change (versioned releases). Download on setup, exclude from repo. |
| Token cost data | JSON | YES | LiteLLM pulls from api.litellm.ai (external). Cache locally as JSON (mergeable). |

**Best Practice for GSD:**
- Vectra indexes: Commit to git (JSON format, human-readable)
- ONNX models: Download on install, store in `~/.claude/models/`, exclude from git
- Cost data: Cache in `.planning/costs/pricing.json`, refresh weekly, commit updates

## Migration Path from Current GSD

| Phase | Changes | Risk |
|-------|---------|------|
| Phase 0 (Prep) | Add Vectra + Transformers.js + gpt-tokenizer to package.json | LOW - Zero breaking changes |
| Phase 1 (Auto Mode) | Integrate gpt-tokenizer + LiteLLM for cost calc | LOW - Additive only |
| Phase 2 (Autonomous) | Add session token tracking in orchestrator | MEDIUM - Context window management critical |
| Phase 3 (Knowledge) | Initialize Vectra indexes, add extraction hooks | MEDIUM - Performance impact on hooks |

**Fallback Guarantees:**
- If Vectra index missing: Skip principle extraction, continue normal operation
- If Transformers.js model missing: Fallback to keyword-based search (no semantic)
- If LiteLLM unavailable: Use static cost estimates from JSON file

## Performance Considerations

| Operation | Vectra | Transformers.js | LiteLLM |
|-----------|--------|-----------------|---------|
| Index size (1000 principles) | ~5MB JSON | N/A | N/A |
| Embedding generation (nomic-embed) | N/A | ~50-200ms per text (CPU) | N/A |
| Vector search (top 10) | <1ms (in-memory) | N/A | N/A |
| Token counting | N/A | N/A | <1ms (WASM) |
| Cost calculation | N/A | N/A | <10ms (API call) |

**Bottlenecks:**
- Embedding generation is CPU-intensive. Use WebGPU in Transformers.js v4 for 10-50x speedup.
- Vectra loads entire index into memory. 10K principles = ~50MB RAM. Acceptable for GSD use case.

## Sources

### Vector Databases
- [Vectra GitHub](https://github.com/Stevenic/vectra) - File-backed local vector DB for Node.js (MEDIUM confidence: verified architecture, active maintenance)
- [zvec GitHub](https://github.com/alibaba/zvec) - Alibaba's embedded vector database (HIGH confidence: official repo, verified v0.2.0 release Feb 2026)
- [Alibaba Open-Sources Zvec](https://www.marktechpost.com/2026/02/10/alibaba-open-sources-zvec-an-embedded-vector-database-bringing-sqlite-like-simplicity-and-high-performance-on-device-rag-to-edge-applications/) - Performance benchmarks (MEDIUM confidence: third-party article, Feb 2026)
- [RxDB JavaScript Vector Database](https://rxdb.info/articles/javascript-vector-database.html) - Browser-based alternative (MEDIUM confidence: official docs)

### Embedding Models
- [Transformers.js Official Docs](https://huggingface.co/docs/transformers.js/en/index) - Official documentation (HIGH confidence: authoritative source)
- [Transformers.js v4 Preview](https://huggingface.co/blog/transformersjs-v4) - February 2026 announcement (HIGH confidence: official Hugging Face blog)
- [Transformers.js v3.8.1 Release](https://github.com/xenova/transformers.js/releases) - Stable version info (HIGH confidence: GitHub releases)
- [nomic-embed-text-v1.5 Hugging Face](https://huggingface.co/nomic-ai/nomic-embed-text-v1.5) - Model card with ONNX support (HIGH confidence: official model repository)
- [Xenova/nomic-embed-text-v1](https://huggingface.co/Xenova/nomic-embed-text-v1) - Transformers.js compatible ONNX version (HIGH confidence: official conversion)
- [Best Embedding Models 2026](https://www.bentoml.com/blog/a-guide-to-open-source-embedding-models) - Comparison guide (MEDIUM confidence: industry blog, Feb 2026)
- [EmbeddingGemma](https://developers.googleblog.com/introducing-embeddinggemma/) - On-device alternative (HIGH confidence: official Google blog)
- [Ollama Embeddings](https://docs.ollama.com/capabilities/embeddings) - Local embedding runtime (HIGH confidence: official docs)

### Token/Cost Tracking
- [gpt-tokenizer npm](https://www.npmjs.com/package/gpt-tokenizer) - Package details (HIGH confidence: verified npm registry, v3.4.0 published 3 months ago)
- [gpt-tokenizer GitHub](https://github.com/niieani/gpt-tokenizer) - Implementation details (HIGH confidence: official repo, verified fastest tokenizer claim)
- [LiteLLM Token Usage Docs](https://docs.litellm.ai/docs/completion/token_usage) - Official documentation (HIGH confidence: authoritative source)
- [LiteLLM Cost Tracking](https://docs.litellm.ai/docs/proxy/cost_tracking) - Cost calculation features (HIGH confidence: official docs)
- [Langfuse Token Tracking](https://langfuse.com/docs/observability/features/token-and-cost-tracking) - Open-source observability (HIGH confidence: official docs)
- [Langfuse Self-Hosting](https://langfuse.com/self-hosting) - Self-hosted deployment (HIGH confidence: official docs)
- [AI Token Cost Tracking Tools 2026](https://www.prompts.ai/blog/top-ai-solutions-track-token-usage-spending) - Industry overview (MEDIUM confidence: third-party aggregation)

### Architecture Patterns
- [Athena-Public GitHub](https://github.com/winstonkoh87/Athena-Public) - Local context DB pattern (MEDIUM confidence: community project, verified v8.5.0 Feb 2026)
- [Git-Friendly Database Discussion](https://clojureverse.org/t/persistent-git-friendly-local-database-any-suggestions/3919) - Community patterns (LOW confidence: forum discussion, but aligns with research)
- [SQLite vs JSON Files](https://sqlite.org/forum/forumpost/3d7be1ad3d?t=c) - Git-friendliness comparison (MEDIUM confidence: official SQLite forum)

### Model Router (Future Research)
- [vLLM Semantic Router](https://blog.vllm.ai/2026/01/05/vllm-sr-iris.html) - Production-ready routing (MEDIUM confidence: official blog, Jan 2026)
- [RouteLLM Framework](https://lmsys.org/blog/2024-07-01-routellm/) - Cost optimization framework (HIGH confidence: LMSYS official blog)
- [LLM Cost Optimization Guide](https://redis.io/blog/large-language-model-operations-guide/) - Best practices (MEDIUM confidence: industry guide)

---

*Stack research for: GSD Enhancements v2.0 - Local Vector Database, Embeddings, Token Tracking*
*Researched: 2026-02-15*
*Overall Confidence: HIGH - Core recommendations verified with official docs and recent 2026 sources*
