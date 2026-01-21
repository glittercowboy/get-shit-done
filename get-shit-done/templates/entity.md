# Entity Template

Template for `.planning/codebase/{entity-slug}.md` - file-level intelligence documentation.

---

## File Template

```markdown
---
path: {path}
type: {type}
stack: {stack}
framework: {framework}
updated: {updated}
status: {status}
---

# {filename}

## Purpose

{purpose}

## Exports

{exports}

## Dependencies

{dependencies}

## Used By

{used_by}

## Notes

{notes}
```

---

## Field Reference

### Frontmatter

| Field | Values | Description |
|-------|--------|-------------|
| `path` | Absolute path | Full path to the file |
| `type` | module, component, util, config, test, api, hook | Primary classification |
| `stack` | javascript, typescript, python, csharp, go, rust, java, etc. | Programming language stack |
| `framework` | react, django, aspnetcore, spring, etc. (optional) | Framework if detected |
| `updated` | YYYY-MM-DD | Last time this entity was updated |
| `status` | active, deprecated, stub | Current state |

### Sections

**Purpose** (required)
1-3 sentences covering:
- What this file does
- Why it exists
- Who/what uses it (high-level)

**Exports** (required for modules with exports)
List each export with signature and description:
```markdown
- `functionName(arg: Type): ReturnType` - What it does
- `ClassName` - What it represents
- `CONSTANT_NAME` - What value it holds
```

For files without exports (config, tests), write "None" or describe what the file defines.

**Dependencies** (required)
Internal dependencies use wiki-links (slugified paths):
```markdown
- [[src-lib-db]] - Database client
- [[src-types-user]] - User type definitions
```

External dependencies use plain text:
```markdown
- react - Component framework
- jose - JWT handling
```

**Used By** (grows over time)
Files that import this one, using wiki-links:
```markdown
- [[src-app-api-auth-route]]
- [[src-components-dashboard]]
```

Initially may be empty or incomplete. Updated as Claude encounters imports.

**Notes** (optional)
Patterns, gotchas, or context:
```markdown
- Uses singleton pattern for connection pooling
- WARNING: Must call `init()` before any other method
- Related: See [[src-lib-cache]] for caching layer
```

---

## Slug Convention

Entity slugs are derived from file paths:
- `src/lib/db.ts` becomes `src-lib-db`
- `src/app/api/auth/route.ts` becomes `src-app-api-auth-route`

Rule: Replace `/` and `.` with `-`, drop file extension.

---

## Example

```markdown
---
path: /project/src/lib/auth.ts
type: util
stack: typescript
framework: nextjs
updated: 2025-01-15
status: active
---

# auth.ts

## Purpose

JWT token management using jose library. Handles token creation, verification, and refresh rotation. Used by all protected API routes via middleware.

## Exports

- `createAccessToken(userId: string): Promise<string>` - Creates 15-min access token
- `createRefreshToken(userId: string): Promise<string>` - Creates 7-day refresh token
- `verifyToken(token: string): Promise<TokenPayload>` - Validates and decodes token
- `rotateRefresh(oldToken: string): Promise<TokenPair>` - Issues new token pair

## Dependencies

- [[src-lib-db]] - Stores refresh tokens for revocation
- [[src-types-auth]] - TokenPayload, TokenPair types
- jose - JWT signing and verification
- bcrypt - Password hashing

## Used By

- [[src-middleware]]
- [[src-app-api-auth-login-route]]
- [[src-app-api-auth-logout-route]]
- [[src-app-api-auth-refresh-route]]

## Notes

- Access tokens are stateless; refresh tokens stored in DB for revocation
- Uses RS256 algorithm with keys from environment
- WARNING: Never log token values, even in debug mode
```

---

## Stack and Framework

The `stack` field identifies the programming language:
- Derived from file extension and surrounding context
- Values match stack IDs from `hooks/lib/stack-profiles.yaml`
- Examples: `javascript`, `typescript`, `python`, `csharp`, `go`, `rust`

The `framework` field is optional:
- Only included when a specific framework is detected
- Examples: `react`, `nextjs`, `django`, `flask`, `aspnetcore`, `spring`
- Omit if no framework detected (don't use "none" or "unknown")

**Why this matters:**
- Enables queries like "find all Python models"
- Allows filtering entities by language in polyglot codebases
- Framework field helps understand conventions in use

---

## Guidelines

**When to create/update:**
- After modifying a file during plan execution
- When encountering a file that lacks documentation
- When relationships change (new imports, exports)

**Minimal viable entity:**
At minimum, an entity needs frontmatter + Purpose. Other sections can be "TBD" if unknown.

**Accuracy over completeness:**
Better to have partial accurate info than complete guesses. Mark unknowns explicitly.

**Link discovery:**
The hook that processes entities extracts all `[[wiki-links]]` to build the relationship graph. Ensure links use correct slug format.
