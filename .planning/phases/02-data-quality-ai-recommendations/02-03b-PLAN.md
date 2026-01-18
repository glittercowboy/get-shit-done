---
phase: 02-data-quality-ai-recommendations
plan: 03b
type: execute
wave: 3
depends_on: ["02-01", "02-02"]
files_modified:
  - frontend/src/app/(dashboard)/validations/page.tsx
  - frontend/src/app/(dashboard)/validations/[id]/page.tsx
  - frontend/src/app/(dashboard)/alerts/page.tsx
  - frontend/src/app/(dashboard)/alerts/[id]/page.tsx
  - frontend/src/components/features/validations/validation-list.tsx
  - frontend/src/components/features/validations/validation-results.tsx
  - frontend/src/components/features/validations/quality-score-card.tsx
  - frontend/src/components/features/alerts/alert-list.tsx
  - frontend/src/components/features/alerts/alert-detail.tsx
  - frontend/src/hooks/use-validations.ts
  - frontend/src/hooks/use-alerts.ts
autonomous: true

must_haves:
  truths:
    - "User can view validation results with pass/fail per rule"
    - "User can see quality dimension scores (completeness, validity, etc.)"
    - "User can see and manage alerts with severity indicators"
    - "User can acknowledge and resolve alerts with notes"
  artifacts:
    - path: "frontend/src/components/features/validations/validation-results.tsx"
      provides: "Validation run results display"
      exports: ["ValidationResults"]
    - path: "frontend/src/components/features/validations/quality-score-card.tsx"
      provides: "Quality score visualization"
      exports: ["QualityScoreCard"]
    - path: "frontend/src/components/features/alerts/alert-list.tsx"
      provides: "Alert dashboard with severity"
      exports: ["AlertList"]
    - path: "frontend/src/hooks/use-validations.ts"
      provides: "TanStack Query hooks for validations"
      exports: ["useValidations", "useValidation", "useTriggerValidation"]
    - path: "frontend/src/hooks/use-alerts.ts"
      provides: "TanStack Query hooks for alerts"
      exports: ["useAlerts", "useAlert", "useAcknowledgeAlert", "useResolveAlert"]
  key_links:
    - from: "frontend/src/hooks/use-validations.ts"
      to: "/api/validations"
      via: "TanStack Query fetch"
      pattern: "useQuery.*validations|fetch.*api/validations"
    - from: "frontend/src/hooks/use-alerts.ts"
      to: "/api/alerts"
      via: "TanStack Query fetch"
      pattern: "useQuery.*alerts|fetch.*api/alerts"
    - from: "frontend/src/components/features/alerts/alert-detail.tsx"
      to: "/api/alerts/[id]"
      via: "PUT request for status update"
      pattern: "useMutation.*acknowledge|useMutation.*resolve"
---

<objective>
Build the frontend for validation results viewing and alert management dashboard.

Purpose: Enable users to view validation run results with quality dimension breakdowns and manage alerts through acknowledgment and resolution workflows.

Output: Working frontend pages for validations and alerts with full status management.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/02-data-quality-ai-recommendations/02-RESEARCH.md
@.planning/phases/02-data-quality-ai-recommendations/02-01-SUMMARY.md
@.planning/phases/02-data-quality-ai-recommendations/02-02-SUMMARY.md
@.planning/phases/01-foundation-data-profiling/01-03-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Validations and Alerts Data Hooks</name>
  <files>
    frontend/src/hooks/use-validations.ts
    frontend/src/hooks/use-alerts.ts
  </files>
  <action>
    Create TanStack Query hooks for validations and alerts:

    **src/hooks/use-validations.ts:**
    - `useValidations(filters?)`: List validation_runs with filters (dataset_id, status, date range)
      - Query key: ['validations', filters]
      - Returns: { data: ValidationRun[], isLoading, error }
    - `useValidation(id)`: Get single run with rule_results and quality_scores
      - Query key: ['validations', id]
      - Returns: { data: ValidationRunDetail, isLoading, error }
      - Include nested rule_results[] and quality_scores[]
    - `useTriggerValidation()`: Mutation to POST /api/validations
      - Input: { dataset_id, rule_ids?: string[] }
      - Invalidates ['validations'] on success
      - Returns run_id for polling
    - `useValidationPolling(id, enabled)`: Poll for running validation status
      - refetchInterval: 5000 (5 seconds) when status='running'
      - Stops polling when status='completed' or 'failed'
    - TypeScript types: ValidationRun, ValidationRunDetail, RuleResult, QualityScore

    **src/hooks/use-alerts.ts:**
    - `useAlerts(filters?)`: List alerts with filters (status, severity, dataset_id)
      - Query key: ['alerts', filters]
      - Default filter: { status: 'open' }
    - `useAlert(id)`: Get single alert with details
      - Query key: ['alerts', id]
    - `useAcknowledgeAlert()`: Mutation to PUT /api/alerts/{id} with status='acknowledged'
      - Takes optional acknowledgment_note
      - Invalidates ['alerts'] and ['alerts', id]
    - `useResolveAlert()`: Mutation to PUT /api/alerts/{id} with status='resolved'
      - Requires resolution_notes
      - Invalidates ['alerts'] and ['alerts', id]
    - `useOpenAlertCount()`: Get count of open alerts for navigation badge
      - Query key: ['alerts', 'count', 'open']
      - Returns number
      - refetchInterval: 30000 (30 seconds) for near-realtime badge
    - TypeScript types: Alert, AlertStatus, AlertSeverity, AlertType
  </action>
  <verify>
    cd frontend && npx tsc --noEmit
    # Check hook exports
    grep -E "export (function|const) use" frontend/src/hooks/use-validations.ts frontend/src/hooks/use-alerts.ts | wc -l
    # Should be 9+ hooks total
  </verify>
  <done>
    Validation and alert hooks compile successfully. useValidationPolling handles running status polling. useOpenAlertCount provides badge count. All mutations invalidate appropriate cache keys.
  </done>
</task>

<task type="auto">
  <name>Task 2: Validation Results and Alert Dashboard UI</name>
  <files>
    frontend/src/app/(dashboard)/validations/page.tsx
    frontend/src/app/(dashboard)/validations/[id]/page.tsx
    frontend/src/app/(dashboard)/alerts/page.tsx
    frontend/src/app/(dashboard)/alerts/[id]/page.tsx
    frontend/src/components/features/validations/validation-list.tsx
    frontend/src/components/features/validations/validation-results.tsx
    frontend/src/components/features/validations/quality-score-card.tsx
    frontend/src/components/features/alerts/alert-list.tsx
    frontend/src/components/features/alerts/alert-detail.tsx
  </files>
  <action>
    Create validation results viewer and alert management dashboard:

    **src/components/features/validations/validation-list.tsx:**
    Table of validation runs using shadcn/ui DataTable:
    - Columns: Dataset, Status, Score, Passed/Failed, Triggered By, Started, Duration
    - Status badges: pending (gray), running (blue with pulse animation), completed (green/red based on score), failed (red)
    - Score as percentage with color gradient: green >80%, yellow 60-80%, red <60%
    - Duration calculated from started_at to completed_at
    - Click row to navigate to /validations/{id}
    - "Run Validation" button opens dataset selector dialog
    - Filter bar: dataset dropdown, status dropdown, date range picker
    - Empty state: "No validation runs yet. Run your first validation to see results."

    **src/components/features/validations/validation-results.tsx:**
    Detailed validation results display:
    - Summary card: overall score (large number), rules passed/failed counts, duration
    - QualityScoreCard for each dimension (completeness, validity, uniqueness, consistency, freshness)
    - Rule results table:
      - Columns: Rule name, Type, Result (pass/fail/error badge), Message
      - Expandable rows showing sample_failures if available
      - Filter toggle: All / Passed / Failed
      - Sort by result (failures first by default)
    - Link to S3 full results if s3_results_uri available
    - Triggered by info: manual, scheduled, pipeline

    **src/components/features/validations/quality-score-card.tsx:**
    Reusable quality dimension score display:
    - Dimension name with icon (e.g., checkmark for completeness)
    - Large score percentage with color (green/yellow/red)
    - Trend indicator: up/down arrow comparing to previous run
    - Mini sparkline showing last 5 scores (optional, can skip for MVP)
    - Click to see dimension breakdown (rules in that category)

    **src/components/features/alerts/alert-list.tsx:**
    Alert dashboard:
    - Stats row at top: Open count (badge), Critical count (red), Warning count (yellow)
    - Filter tabs: All | Open | Acknowledged | Resolved
    - Sort by: Severity (default, critical first), Created (newest first), Dataset
    - Alert cards layout (not table, better for scanning):
      - Severity icon: red exclamation (critical), yellow warning (warning), blue info (info)
      - Title (bold) and message preview (truncated)
      - Alert type badge: Rule Failure, Freshness SLA, Volume Anomaly
      - Dataset name, relative time (e.g., "2 hours ago")
      - Quick actions: "Acknowledge" button (if open), "View" button
    - Real-time feel: refetch on window focus
    - Empty state per tab: "No open alerts" / "No alerts match filters"

    **src/components/features/alerts/alert-detail.tsx:**
    Full alert view:
    - Header: Title, severity badge, alert type badge
    - Full message text
    - Details section: JSON viewer for details object (collapsible)
    - Related links: Dataset (link), Rule (link if rule_failure), Validation run (link if from validation)
    - Status workflow section:
      - Current status badge
      - If Open: "Acknowledge" button with optional note textarea
      - If Acknowledged: "Resolve" button with required resolution notes textarea
      - "Snooze" dropdown: 1 hour, 4 hours, 1 day, 1 week
    - Timeline: vertical timeline showing created, acknowledged, resolved with timestamps and who

    **src/app/(dashboard)/validations/page.tsx:**
    - ValidationList component as main content
    - Filter bar at top
    - "Run Validation" CTA button in header
    - Page title: "Validation Runs"

    **src/app/(dashboard)/validations/[id]/page.tsx:**
    - useValidation(id) to fetch details
    - If status='running': show loading state with live status using useValidationPolling
    - If status='completed' or 'failed': show ValidationResults
    - Breadcrumb: Validations > Run #{id.slice(0,8)}
    - Back button to /validations

    **src/app/(dashboard)/alerts/page.tsx:**
    - AlertList component as main content
    - Open alert count prominently displayed
    - Page title: "Alerts"

    **src/app/(dashboard)/alerts/[id]/page.tsx:**
    - useAlert(id) to fetch details
    - AlertDetail component
    - Breadcrumb: Alerts > Alert #{id.slice(0,8)}
    - Back button to /alerts

    **Update dashboard navigation (in layout or nav component):**
    - Add "Validations" link with icon
    - Add "Alerts" link with icon and badge showing useOpenAlertCount()
  </action>
  <verify>
    cd frontend && npm run build
    # Check all new components exist
    ls frontend/src/components/features/validations/*.tsx frontend/src/components/features/alerts/*.tsx | wc -l
    # Should be 5 (validation-list, validation-results, quality-score-card, alert-list, alert-detail)
  </verify>
  <done>
    Validation pages display run history with polling for running status. Quality scores show dimension breakdown with color coding. Alert dashboard shows open alerts sorted by severity. Status workflow allows acknowledge/resolve with notes.
  </done>
</task>

</tasks>

<verification>
1. `cd frontend && npm run build` succeeds
2. Validation list shows running status with polling
3. Validation results display quality dimension scores
4. Alert list displays with severity indicators and quick actions
5. Alert detail supports acknowledge/resolve workflow
6. Navigation updated with Validations and Alerts links (with badge)
7. All hooks properly cache and invalidate data
</verification>

<success_criteria>
- Validation results show overall score and per-rule breakdown
- Quality dimension scores display (completeness, validity, uniqueness, consistency, freshness)
- Running validations poll for status updates
- Alert dashboard shows open alerts sorted by severity
- Alert status can be updated: acknowledge, resolve with notes, snooze
- Navigation includes Validations and Alerts sections with alert badge count
- DQ-06 satisfied: Quality scores displayed
- DQ-07 satisfied: Alerts created for violations
</success_criteria>

<output>
After completion, create `.planning/phases/02-data-quality-ai-recommendations/02-03b-SUMMARY.md`
</output>
