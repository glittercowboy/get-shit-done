# Algorithm Template

Template for `.planning/algorithms/<name>.md` - living documents that keep algorithm specifications and implementations in sync.

---

## When to Use

Algorithm docs are for projects with mathematical/computational specifications that can drift from code:
- **Robotics:** State estimation, control systems, kinematics
- **ML/DL:** Neural network architectures, training pipelines, loss functions
- **Scientific:** Numerical methods, solvers, simulations
- **Graphics:** Rendering pipelines, shaders, transforms

## File Template

```markdown
---
owns:
  - path/to/implementation.py
  - path/to/related_file.py
---

# [Algorithm Name]

## Purpose

[What problem it solves. Where it's used in the system.]

## Inputs

| Symbol | Code | Meaning | Units/Shape | Frame/Format |
|--------|------|---------|-------------|--------------|
| $[symbol]$ | `[var_name]` | [description] | [units or tensor shape] | [frame or data format] |

## Outputs

| Symbol | Code | Meaning | Units/Shape | Frame/Format |
|--------|------|---------|-------------|--------------|
| $[symbol]$ | `[var_name]` | [description] | [units or tensor shape] | [frame or data format] |

## Conventions

- **Frames/Spaces:** [e.g., body-fixed NED, world space, clip space]
- **Signs:** [e.g., positive = clockwise, loss minimized]
- **Coordinates:** [e.g., [x, y, z, roll, pitch, yaw], NCHW]
- **Ordering:** [e.g., [position; orientation], batch-first]

## Method

### [Overview / Model / Architecture]

[High-level description: governing equations, network architecture, or pipeline.]

$[key equation or architecture diagram]$

---

### Step 1: [Step Name]

[Mathematical derivation, layer definition, or pipeline stage.]

$[key equation or architecture diagram]$

> [!implementation] `[function_name]()`
> **File:** `[path/to/file.ext]`
> **Inputs:** `[var1]`, `[var2]`
> **Output:** `[var]` → $[symbol]$

---

### Step 2: [Step Name]

[Continue...]

$[equation or layer spec]$

> [!implementation] `[function_name]()`
> **File:** `[path/to/file.ext]`
> **Output:** `[var]` → $[symbol]$

---

[Continue pattern for each step...]

## Implementation Mapping

| Step | Function | File | Responsibility |
|------|----------|------|----------------|
| 1 | `[func]()` | `[file]` | [what it computes] |
| 2 | `[func]()` | `[file]` | [what it computes] |

**Integration point:** `[file where algorithm is called/orchestrated]`

## Invariants

[Properties that must remain true after refactors:]

- [Invariant 1, e.g., "Covariance always positive semi-definite"]
- [Invariant 2, e.g., "Outputs sum to 1 (softmax)"]

## Validation

[How to verify correctness:]

- **Unit test:** `[test_name]` passes with [criteria]
- **Integration:** [output metric] within [tolerance] of [reference]
- **Visual:** [what to check manually if applicable]

## Defaults

| Name | Value | Units | Purpose |
|------|-------|-------|---------|
| `[param_name]` | `[value]` | `[units]` | [why this default] |

## Convergence (optional - scientific computing)

[For iterative methods:]

- **Convergence criteria:** [e.g., residual < 1e-6]
- **Expected iterations:** [typical range]
- **Stability conditions:** [e.g., CFL condition, step size limits]

## Shader Context (optional - graphics)

[For GPU shaders:]

| Stage | Shader | Purpose |
|-------|--------|---------|
| Vertex | `[shader.vert]` | [transform] |
| Fragment | `[shader.frag]` | [shading] |

**Coordinate spaces:** object → world → view → clip → NDC → screen
```

<frontmatter_guidance>
**owns:** List of file paths this algorithm document covers. Used for:
1. **Auto-loading:** `/gsd:plan-phase` loads algorithm docs when planning touches owned files
2. **Sync alerts:** `/gsd:execute-plan` flags Algorithm Sync when owned files are modified

**Pattern:** Glob-style paths relative to project root
```yaml
owns:
  - src/ekf.py           # Exact file
  - src/filters/*.py     # Pattern match
  - src/ml/model.py
```
</frontmatter_guidance>

<domain_adaptation>
The Method section flexes to fit each domain:

| Domain | Method Style | Key Conventions |
|--------|-------------|-----------------|
| **Robotics** | Model → Given → Find → Steps | Coordinate frames, units |
| **ML/DL** | Architecture → Forward → Loss | Tensor shapes, data formats |
| **Scientific** | Method → Discretization → Iteration | Convergence, stability |
| **Graphics** | Pipeline → Transforms → Shading | Coordinate spaces, shader stages |
</domain_adaptation>

<implementation_callout>
The `[!implementation]` callout links spec to code inline. Renders as blockquote on GitHub:

```markdown
> [!implementation] `predict()`
> **File:** `src/ekf.py`
> **Inputs:** `state`, `dt`
> **Output:** `predicted_state` → $\hat{x}_{k|k-1}$
```

In Obsidian, renders as a styled callout. On GitHub, renders as:
> **implementation** `predict()`
> **File:** `src/ekf.py`
> ...
</implementation_callout>

<example>
```markdown
---
owns:
  - src/ekf.py
  - src/ukf.py
---

# Extended Kalman Filter

## Purpose

Estimates vehicle state (position, velocity, orientation) from noisy IMU and GPS measurements. Core of the localization pipeline.

## Inputs

| Symbol | Code | Meaning | Units/Shape | Frame/Format |
|--------|------|---------|-------------|--------------|
| $z_k$ | `measurement` | Sensor reading | varies | sensor frame |
| $u_k$ | `control_input` | IMU data | [ax, ay, az, gx, gy, gz] | body frame |
| $\Delta t$ | `dt` | Time step | seconds | — |

## Outputs

| Symbol | Code | Meaning | Units/Shape | Frame/Format |
|--------|------|---------|-------------|--------------|
| $\hat{x}_k$ | `state_estimate` | Filtered state | [x, y, z, vx, vy, vz, q] | world frame |
| $P_k$ | `covariance` | Uncertainty | 10x10 matrix | — |

## Conventions

- **Frames:** NED (North-East-Down) world frame, FRD body frame
- **Signs:** Positive rotation = right-hand rule
- **Coordinates:** [position (3), velocity (3), quaternion (4)]
- **Ordering:** State vector is [pos; vel; quat]

## Method

### State Transition Model

$$x_k = f(x_{k-1}, u_k) + w_k$$

Where $f$ applies IMU integration and $w_k \sim \mathcal{N}(0, Q)$.

---

### Step 1: Predict

Propagate state and covariance forward:

$$\hat{x}_{k|k-1} = f(\hat{x}_{k-1}, u_k)$$
$$P_{k|k-1} = F_k P_{k-1} F_k^T + Q$$

> [!implementation] `predict()`
> **File:** `src/ekf.py`
> **Inputs:** `state`, `control_input`, `dt`
> **Output:** `predicted_state` → $\hat{x}_{k|k-1}$

---

### Step 2: Update

Correct prediction with measurement:

$$K_k = P_{k|k-1} H_k^T (H_k P_{k|k-1} H_k^T + R)^{-1}$$
$$\hat{x}_k = \hat{x}_{k|k-1} + K_k(z_k - h(\hat{x}_{k|k-1}))$$

> [!implementation] `update()`
> **File:** `src/ekf.py`
> **Inputs:** `predicted_state`, `measurement`
> **Output:** `state_estimate` → $\hat{x}_k$

## Implementation Mapping

| Step | Function | File | Responsibility |
|------|----------|------|----------------|
| 1 | `predict()` | `src/ekf.py` | State propagation |
| 2 | `update()` | `src/ekf.py` | Measurement correction |

**Integration point:** `src/localization/pipeline.py`

## Invariants

- Covariance $P$ always positive semi-definite
- Quaternion $q$ always normalized ($\|q\| = 1$)
- State estimate bounded within physical limits

## Validation

- **Unit test:** `test_ekf_convergence` - filter converges to truth within 10 steps
- **Integration:** Position error < 0.5m after 100 steps with synthetic data
- **Visual:** Plot state estimate vs ground truth, check tracking

## Defaults

| Name | Value | Units | Purpose |
|------|-------|-------|---------|
| `process_noise` | `0.01` | m/s² | IMU noise floor |
| `measurement_noise` | `1.0` | m | GPS accuracy |
```
</example>

<guidelines>
**When to create:**
- New algorithm implementation starting from spec
- Existing algorithm code needing documentation
- During `/gsd:map-codebase` if algorithm patterns detected

**Workflow integration:**
- `/gsd:new-project` asks "Do you have algorithms to document?"
- `/gsd:map-codebase` optionally detects algorithm patterns
- `/gsd:plan-phase` auto-loads via `owns:` intersection
- `/gsd:execute-plan` flags Algorithm Sync in SUMMARY.md

**Keeping in sync:**
When code changes, Algorithm Sync section in SUMMARY.md flags affected docs. User decides whether to update spec.
</guidelines>
