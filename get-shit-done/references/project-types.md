<project_types>

Project type detection and type-specific guidance for GSD workflows.

<detection>

## Auto-Detection

GSD detects project type from dependencies during `/gsd:new-project`:

**Node.js/TypeScript (package.json):**

| Keywords | Type |
|----------|------|
| `react`, `vue`, `angular`, `svelte`, `next`, `nuxt` | `web-frontend` |
| `express`, `fastify`, `koa`, `hapi`, `nestjs`, `hono` | `web-backend` |
| `commander`, `yargs`, `inquirer`, `chalk`, `ora` | `cli-tool` |
| `types`, `main`, `module`, `exports` (no `start`/`dev`) | `library` |

**Python (requirements.txt, pyproject.toml):**

| Keywords | Type |
|----------|------|
| `flask`, `django`, `fastapi`, `starlette` | `web-backend` |
| `click`, `typer`, `argparse` | `cli-tool` |

**Go (go.mod):**

| Keywords | Type |
|----------|------|
| `gin`, `echo`, `fiber`, `chi` | `web-backend` |
| `cobra`, `urfave/cli` | `cli-tool` |

**Default:** `general` when no patterns match.

</detection>

<type_guidance>

## Type-Specific Guidance

### web-frontend

**Focus areas:**
- Component architecture and design system
- State management patterns
- User experience and accessibility
- Performance optimization (bundling, lazy loading)
- Testing (unit, integration, E2E)

**Research emphasis:**
- UI/UX patterns for the domain
- Component library choices
- State management approaches
- Build tooling and optimization

**Common phases:**
1. Project scaffold and design system
2. Core components and layouts
3. State management and data fetching
4. Feature pages
5. Polish and optimization

---

### web-backend

**Focus areas:**
- API design and documentation
- Data modeling and database design
- Authentication and authorization
- Error handling and validation
- Testing and monitoring

**Research emphasis:**
- API patterns (REST, GraphQL, tRPC)
- Database choices and ORM patterns
- Auth approaches (JWT, sessions, OAuth)
- Deployment and infrastructure

**Common phases:**
1. Project scaffold and database setup
2. Auth and user management
3. Core API endpoints
4. Background jobs and integrations
5. Deployment and monitoring

---

### cli-tool

**Focus areas:**
- Command structure and argument parsing
- Output formatting and user feedback
- Configuration and persistence
- Shell integration and scripting
- Testing and distribution

**Research emphasis:**
- Argument parsing libraries
- Terminal UI patterns (colors, spinners, tables)
- Configuration file formats
- Distribution methods (npm, homebrew, etc.)

**Common phases:**
1. Project scaffold and CLI framework
2. Core commands
3. Configuration and persistence
4. Output formatting and UX
5. Distribution and documentation

---

### library

**Focus areas:**
- API surface design
- Type definitions and documentation
- Versioning and changelog
- Testing across environments
- Bundle size and tree-shaking

**Research emphasis:**
- API design patterns
- Documentation standards
- Testing strategies
- Build and publish workflows

**Common phases:**
1. Project scaffold and build setup
2. Core API implementation
3. Documentation and examples
4. Testing and edge cases
5. Publishing and versioning

---

### general

**Focus areas:**
- Full-stack considerations
- No assumptions about architecture
- Flexible research

**Research emphasis:**
- Broader ecosystem research
- Multiple stack options presented
- User preference weighted

**Common phases:**
Determined by project requirements, no preset structure.

</type_guidance>

<research_adaptation>

## Adapting Research by Type

When spawning research agents, adapt focus based on `project_type`:

**web-frontend:**
- Stack: Focus on frontend frameworks, component libraries, state management
- Features: UI patterns, accessibility requirements, responsive design
- Architecture: Component hierarchy, data flow, client-side routing
- Pitfalls: Bundle size, hydration issues, SEO considerations

**web-backend:**
- Stack: Focus on server frameworks, ORMs, auth libraries
- Features: API capabilities, integrations, real-time features
- Architecture: API design, database schema, service layers
- Pitfalls: N+1 queries, auth vulnerabilities, rate limiting

**cli-tool:**
- Stack: Focus on CLI frameworks, terminal UI libraries
- Features: Command patterns, configuration options
- Architecture: Command hierarchy, plugin systems
- Pitfalls: Cross-platform compatibility, shell escaping

**library:**
- Stack: Focus on build tools, testing frameworks, type generation
- Features: API surface, customization points
- Architecture: Module structure, dependency management
- Pitfalls: Breaking changes, bundle size, type accuracy

</research_adaptation>

<manual_override>

## Manual Override

If auto-detection is wrong, users can override in config.json:

```json
{
  "project_type": "web-backend"
}
```

Or during `/gsd:new-project`, answer "Other" when asked and specify the type.

</manual_override>

</project_types>
