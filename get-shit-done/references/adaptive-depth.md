# Adaptive Depth Protocol

Generalized depth assessment for any workflow that writes context documents. Extracted from discuss-phase questioning logic to prevent both over-probing (wasting user patience on thin input) and under-probing (writing shallow context when rich input was available).

**Consumers:** `discuss-phase`, `plan-phase`, any workflow that transforms user input into a context document.

**Core principle:** Match probing depth to input richness. Never ask 8 questions when the user gave you a sentence. Never write a shallow context document when the user gave you a paragraph of specifics.

---

<input_richness_assessment>

## Input Richness Assessment

Before choosing a depth level, assess the user's input across four dimensions.

### 1. Length

Raw volume of content provided.

| Signal | Indicator |
|--------|-----------|
| Thin | 1-2 sentences, single clause answers |
| Medium | 1-2 paragraphs, multiple points |
| Rich | 3+ paragraphs, structured thoughts, multiple aspects covered |

### 2. Specificity

How concrete vs. abstract the input is.

| Signal | Indicator |
|--------|-----------|
| Abstract | "I want it to be good", "make it modern", "simple UX" |
| Directional | "Card-based layout", "infinite scroll", "retry on failure" |
| Precise | "3 retries with exponential backoff", "JWT with 15-min expiry", "grid with 3 columns at 1024px" |

### 3. Terminology Density

Domain-specific language that signals expertise and locked decisions.

| Signal | Indicator |
|--------|-----------|
| Low | General language, no technical terms |
| Medium | Some domain terms mixed with general language |
| High | Technical terms, library names, pattern references, architecture vocabulary |

### 4. Emotion Markers

Signals of strong preference, past frustration, or non-negotiable constraints.

| Signal | Examples |
|--------|---------|
| Neutral | Factual statements without emphasis |
| Preferential | "I like how X does it", "something like Y" |
| Strong | "I hate when apps do X", "this MUST work in CI", "never delete anything", "worst case, move to a review folder" |

</input_richness_assessment>

<depth_levels>

## Depth Levels

Assessment results map to one of three depth levels. The mapping is not mechanical -- use judgment. A short input with high specificity and strong emotion markers may warrant deep-probe. A long input that is entirely abstract may warrant quick-probe.

### Level 1: Pass-through

**When:** Input is thin AND specific enough to act on. The user said what they want clearly but briefly. More questions would feel like bureaucracy.

**Signals:** Short input + high specificity + terminology density. Or: the user explicitly said "just do it" / "you decide".

**Action:**
- Write context document directly from input
- Mark low-confidence areas with `[inferred]` tag
- Do NOT ask questions -- probing a clear, brief input signals that you were not listening

**Example input:** "Card layout, infinite scroll, pull to refresh. Like Twitter but cleaner."
**Example response:** Write context with those decisions locked, mark layout details as Claude's discretion.

### Level 2: Quick-probe

**When:** Input has gaps that would cause downstream agents to guess. 1-2 targeted questions close the gaps.

**Signals:** Medium length + directional specificity but missing key dimensions (e.g., has layout preferences but no loading behavior, has feature list but no priority signal).

**Action:**
- Identify the 1-2 specific gaps
- Ask focused questions (not open-ended exploration)
- Write context document after answers

**Example input:** "I want a backup command that works with S3 and local files."
**Example gap:** Output format (human-readable? JSON? both?) and error handling philosophy (fail fast? retry?) are unspecified.
**Example probe:** "Two quick things: should this output be human-readable, JSON for CI, or both? And on failures -- fail fast or retry?"

### Level 3: Deep-probe

**When:** Input is abstract, thin, or spans multiple domains that need separate clarification. The full depth_protocol questioning flow is warranted.

**Signals:** Abstract language + low specificity + low terminology density. Or: rich input that covers many areas but shallowly. Or: emotion markers suggest strong preferences that have not been articulated yet.

**Action:**
- Use the full questioning protocol from `references/questioning.md`
- Follow the thread, build on answers
- Write context document only when gaps are closed

**Example input:** "I want to organize my photos better."
**Example response:** Full exploration -- what does "better" mean? How do you find photos now? What frustrates you? When would you feel this was working?

</depth_levels>

<context_writing_gate>

## Context Writing Gate

Before writing ANY context document, enumerate what you have and check coverage. This prevents writing thin documents that force downstream agents to guess.

### Gate Checklist

```
For each decision area the phase requires:
  [ ] Source: Where did this come from? (user input / inferred / unaddressed)
  [ ] Confidence: High (user stated) / Medium (inferred from context) / Low (default assumption)
  [ ] Reasoning: Is the WHY captured, not just the WHAT?
```

### Gate Rules

1. **Every decision must have a source.** If you write "card-based layout" the document must show whether the user said it, you inferred it, or it is a default.

2. **Inferred decisions must be marked.** Use `[inferred]` or place them in a "Claude's Discretion" section. Downstream agents need to know which decisions they can challenge vs. which are locked by the user.

3. **Low-confidence areas block context writing at deep-probe level.** If you are in deep-probe mode and still have low-confidence areas after probing, flag them explicitly rather than writing confident-sounding guesses.

4. **Reasoning is mandatory for user-stated decisions.** A decision without its WHY forces the planner to guess intent. "Card layout" is incomplete. "Card layout -- user wants contained units, referenced Linear's issue cards" is complete.

### Coverage Matrix

Before writing, mentally fill this for the phase:

| Decision Area | Source | Confidence | Reasoning Captured |
|---------------|--------|------------|-------------------|
| [Area 1] | user-stated | high | yes |
| [Area 2] | inferred | medium | partial |
| [Area 3] | unaddressed | low | no |

- All "high" confidence with reasoning: **Write the document.**
- Mix of high and medium: **Write, mark inferred sections.**
- Any "low" or "unaddressed" in critical areas: **Probe first, then write.**

</context_writing_gate>

<integration_notes>

## Integration Notes

**How workflows load this:** Any workflow that transforms user input into a context document should reference this protocol before beginning the transformation. It replaces ad-hoc "do I have enough?" judgment with a structured assessment.

**Relationship to questioning.md:** This protocol decides WHETHER and HOW MUCH to question. `references/questioning.md` defines HOW to question (philosophy, question types, anti-patterns). Deep-probe level delegates to the full questioning guide. Pass-through and quick-probe levels do not.

**Relationship to context.md template:** This protocol gates WHEN to write. `templates/context.md` defines WHAT to write. The coverage matrix here feeds directly into the decision sections there.

</integration_notes>
