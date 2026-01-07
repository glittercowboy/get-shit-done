---
description: Initialize a new project using Great Shit Done (GSD) methodology
---

# GSD: New Project Initialization

This workflow guides you through initializing a new project using the GSD system.

## 1. Environment Checks

First, check if a project is already initialized or if we are in a brownfield environment.

// turbo
1. Check if `.planning/PROJECT.md` already exists. If it does, inform the user and abort.
2. Check if a git repository exists in the current directory.
   - If not, ask the user if they want to initialize one.
3. Check for existing code files (brownfield detection).
   - If found, ask the user if they want to map the codebase first (reference `gsd-map-codebase` - *Note: Port pending*).

## 2. Context Gathering

You need to gather deep context to build the `PROJECT.md`. Do not rush this.

1. **The Idea**: Ask the user: "What do you want to build?" (Freeform).
2. **Clarification**: Based on their answer, ask 2-3 follow-up questions to sharpen the idea.
3. **The Core**: Ask: "If you could only nail one thing, what would it be?"
4. **The Boundary**: Ask: "What is explicitly NOT in v1 (Out of Scope)?"
5. **The Constraints**: Ask: "Are there any hard constraints (tech stack, timeline, budget)?"

**Guidance**: You can combine these into a conversational flow. Do not proceed until you have a clear picture of the project.

## 3. Create Artifacts

Once you have the context, create the project files.

1. **Read Template**: Read the template at `.agent/templates/gsd/project.md`. (You may need to adjust the path to be absolute or relative to workspace root).
2. **Synthesize**: Create `.planning/PROJECT.md` by filling in the template with the gathered context.
   - **Greenfield**: All requirements are "Active" (hypotheses).
   - **Brownfield**: Inferred requirements are "Validated", new ones are "Active".
3. **Config**: Create `.planning/config.json`.
   - Ask the user for their preferred "Planning Depth" (Quick, Standard, Comprehensive).
   - Create the file with `{"mode": "interactive", "depth": "[user_choice]"}`.

## 4. git Commit

1. Create the `.planning` directory if it doesn't exist.
2. Write the files.
3. Commit the changes:
   ```bash
   git add .planning/PROJECT.md .planning/config.json
   git commit -m "docs: initialize project via GSD"
   ```

## 5. Next Steps

Inform the user that the project is initialized.
Suggest running the **Create Roadmap** workflow next.
