# Algorithm Template

Template for `.planning/algorithms/<name>.md` — specifications that bridge math and code.

---

## When to Use

Projects with computational logic requiring precise implementation:
- **Robotics:** State estimation, control, calibration, kinematics
- **ML/DL:** Architectures, training loops, loss functions
- **Scientific:** Solvers, simulations, numerical methods
- **Graphics:** Rendering pipelines, shaders, coordinate transforms

## File Template

```markdown
---
owns:
  - path/to/impl.py
  - path/to/impl.cpp
---

# [Algorithm Name]

## Purpose

[What this solves. Where it fits in the system.]

## I/O

**Inputs:**
- `name` (type/shape): description [units/frame if applicable]

**Outputs:**
- `name` (type/shape): description [units/frame if applicable]

## Conventions

[Domain-specific conventions that affect correctness:
coordinate frames, rotation conventions, tensor layouts, sign conventions, etc.]

## Diagram

[Required. Visual representation of the algorithm flow.

Choose the style that best fits your algorithm:
- **Pipeline:** A → B → C → D (sequential transformations)
- **Architecture:** Layered boxes (neural networks, systems)
- **Flowchart:** Branches and decisions
- **Data flow:** Show how variables transform through steps
- **Math flow:** Equations connected by arrows

Use ASCII art, or describe structure clearly for diagram generation.]

## Method

[High-level description of the approach. What techniques are used and why.]

### Step 1: [Name]

[Describe what this step does and how.

Include as needed:
- Key equations or operations
- Important intermediate variables
- Matrix/tensor constructions
- Solver or decomposition used
- Implementation hints

Write enough that someone could implement it. Skip boilerplate.]

### Step 2: [Name]

[Continue for each major step...]

---

## Implementation

[How the spec maps to code:
- File structure and key functions
- Function → Step mapping
- Key constants and their rationale
- Execution patterns or calling conventions]

## Notes

[Anything else relevant:
- Invariants that must hold (e.g., "rotation matrix must be SO(3)")
- Edge cases and how to handle them
- Validation approaches (tests, tolerances, visual checks)
- Known limitations or assumptions]
```

<frontmatter>
**owns:** Implementation files this algorithm covers.
- `/gsd:plan-phase` auto-loads when planning touches owned files
- `/gsd:algorithm-drift` uses this to compare spec vs code
- Supports globs: `src/filters/*.py`
</frontmatter>

<guidance>
**Diagram is required.** It's the most important element for understanding algorithm flow.
Choose the style that fits - don't force a pipeline if architecture diagram is clearer.

**Steps should breathe.** Include equations, variables, pseudocode as needed - but don't
fill slots for the sake of structure. Write what helps implementation.

**Domain adaptation:**
| Domain | Diagram Style | Step Focus |
|--------|---------------|------------|
| Robotics | Pipeline or state flow | Equations, frames, matrix ops |
| ML/DL | Architecture layers | Dimensions, activations, forward pass |
| Graphics | Pipeline with spaces | Coordinate transforms, shader stages |
| Scientific | Iteration loop | Update rules, convergence criteria |

**Implementation section:** Link spec to code. Table, bullets, or prose - whatever fits.

**Notes section:** Catch-all for invariants, edge cases, validation. Keep it practical.
</guidance>
