---
phase: 02-data-quality-ai-recommendations
plan: 03a
type: execute
wave: 3
depends_on: ["02-01", "02-02"]
files_modified:
  - frontend/src/app/(dashboard)/rules/page.tsx
  - frontend/src/app/(dashboard)/rules/new/page.tsx
  - frontend/src/app/(dashboard)/rules/[id]/page.tsx
  - frontend/src/components/features/rules/rule-form.tsx
  - frontend/src/components/features/rules/rule-list.tsx
  - frontend/src/components/features/rules/rule-generator.tsx
  - frontend/src/components/features/rules/approval-panel.tsx
  - frontend/src/components/features/rules/template-picker.tsx
  - frontend/src/hooks/use-rules.ts
autonomous: true

must_haves:
  truths:
    - "User can create quality rules via natural language description"
    - "User can see AI-provided reasoning for suggested rules"
    - "User can approve or reject pending AI-generated rules"
    - "User can apply industry-standard templates to create rules"
  artifacts:
    - path: "frontend/src/app/(dashboard)/rules/new/page.tsx"
      provides: "Rule creation page with AI generator"
      min_lines: 50
    - path: "frontend/src/components/features/rules/rule-generator.tsx"
      provides: "Natural language to rule AI interface"
      exports: ["RuleGenerator"]
    - path: "frontend/src/components/features/rules/approval-panel.tsx"
      provides: "Pending rule approval UI"
      exports: ["ApprovalPanel"]
    - path: "frontend/src/hooks/use-rules.ts"
      provides: "TanStack Query hooks for rules CRUD"
      exports: ["useRules", "useRule", "useGenerateRule", "useApproveRule"]
  key_links:
    - from: "frontend/src/components/features/rules/rule-generator.tsx"
      to: "/api/rules/generate"
      via: "API call to backend"
      pattern: "fetch.*api/rules/generate|useMutation.*generate"
    - from: "frontend/src/hooks/use-rules.ts"
      to: "Supabase dq_rules table"
      via: "TanStack Query + Supabase"
      pattern: "useQuery.*from.*dq_rules"
    - from: "frontend/src/components/features/rules/approval-panel.tsx"
      to: "backend/api/rules/[id]/approve"
      via: "POST request"
      pattern: "fetch.*approve|useMutation.*approve"
---

<objective>
Build the frontend for quality rule management with AI-powered rule generation.

Purpose: Enable users to create data quality rules via natural language descriptions, review AI suggestions with reasoning, and approve/reject rules through an intuitive interface.

Output: Working frontend pages for rules with AI generation, template application, and approval workflow.
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
  <name>Task 1: Rules Data Hooks</name>
  <files>
    frontend/src/hooks/use-rules.ts
  </files>
  <action>
    Create TanStack Query hooks for rule management:

    **src/hooks/use-rules.ts:**
    - `useRules(filters?)`: List dq_rules from Supabase with filters (dataset_id, status, rule_type)
      - Query key: ['rules', filters]
      - Returns: { data: Rule[], isLoading, error }
    - `useRule(id)`: Get single rule with full details
      - Query key: ['rules', id]
      - Returns: { data: Rule, isLoading, error }
    - `usePendingRules()`: Get rules with status='pending' for approval queue
      - Query key: ['rules', { status: 'pending' }]
      - Include count for badge display
    - `useCreateRule()`: Mutation to create rule via POST /api/rules
      - Invalidates ['rules'] on success
    - `useUpdateRule()`: Mutation to update rule via PUT /api/rules/{id}
    - `useApproveRule()`: Mutation to POST /api/rules/{id}/approve
      - Invalidates ['rules'] and ['rules', id] on success
    - `useRejectRule()`: Mutation to POST /api/rules/{id}/reject
      - Takes reason as parameter
    - `useGenerateRule()`: Mutation to call /api/rules/generate
      - Input: { description, column_name, dataset_id, profile_summary? }
      - Returns: { rule, reasoning, false_positive_scenarios, severity }
      - No cache invalidation (generation doesn't create rule yet)
    - Proper TypeScript types for Rule, RuleGenerationRequest, RuleGenerationResponse
    - Error handling with toast notifications
  </action>
  <verify>
    cd frontend && npx tsc --noEmit
    # Check hook exports
    grep -E "export (function|const) use" frontend/src/hooks/use-rules.ts | wc -l
    # Should be 7+ hooks
  </verify>
  <done>
    Rules hooks compile successfully. useGenerateRule calls /api/rules/generate. useApproveRule/useRejectRule handle approval workflow. All mutations invalidate appropriate cache keys.
  </done>
</task>

<task type="auto">
  <name>Task 2: Rule Management Components and Pages</name>
  <files>
    frontend/src/app/(dashboard)/rules/page.tsx
    frontend/src/app/(dashboard)/rules/new/page.tsx
    frontend/src/app/(dashboard)/rules/[id]/page.tsx
    frontend/src/components/features/rules/rule-form.tsx
    frontend/src/components/features/rules/rule-list.tsx
    frontend/src/components/features/rules/rule-generator.tsx
    frontend/src/components/features/rules/approval-panel.tsx
    frontend/src/components/features/rules/template-picker.tsx
  </files>
  <action>
    Create rule management pages and AI-powered rule generator:

    **src/components/features/rules/rule-generator.tsx:**
    AI-powered rule creation interface:
    - Dataset selector (from use-sources hook from Phase 1)
    - Column selector (populated from dataset schema/profile)
    - Natural language description textarea with placeholder examples
    - "Generate Rule" button that calls useGenerateRule mutation
    - Loading state with "AI is analyzing..." message and spinner
    - Response display:
      - Generated DQDL rule (code block with syntax highlighting, copy button)
      - Reasoning explanation (expandable card showing why this rule)
      - False positive scenarios (warning list)
      - Suggested severity badge
    - "Accept and Create" button (creates rule with status='pending', generated_by='ai_recommender')
    - "Regenerate" button to try again with same input
    - "Start Over" to clear form

    **src/components/features/rules/template-picker.tsx:**
    Industry template selection:
    - Grid of template cards by category (format, range, consistency, compliance)
    - Each card shows: name, description, example DQDL
    - Click to select, then configure:
      - Column selector for applying template
      - Parameter inputs if template is parameterized (e.g., min/max for range)
    - Preview of generated DQDL with substituted values
    - "Apply Template" creates rule (status='pending' by default)

    **src/components/features/rules/rule-form.tsx:**
    Manual rule creation/edit form:
    - Dataset and column selectors (column optional for table-level rules)
    - Rule type dropdown: completeness, uniqueness, range, pattern, freshness, referential, custom
    - DQDL expression textarea with monospace font
    - Description field (what this rule checks)
    - Severity selector: critical (red), warning (yellow), info (blue)
    - For edit mode: show readonly fields if rule is 'active'
    - Validation: basic DQDL syntax check (bracket matching, known keywords)
    - Form submission uses useCreateRule or useUpdateRule

    **src/components/features/rules/rule-list.tsx:**
    Table of rules using shadcn/ui DataTable:
    - Columns: Name/Description, Column, Type, Severity, Status, Created, Actions
    - Status badges: pending (yellow), approved (blue), active (green), disabled (gray), deprecated (strikethrough)
    - Filter bar: status dropdown, rule_type dropdown, severity dropdown
    - Bulk actions: approve selected, reject selected (for pending rules only)
    - Click row to navigate to detail page
    - Delete action (with confirmation dialog)
    - Empty state: "No rules yet. Create your first rule with AI assistance."

    **src/components/features/rules/approval-panel.tsx:**
    Pending rules approval interface:
    - Show rule details: DQDL expression (code block), description
    - Reasoning section (if AI-generated): expandable with full AI explanation
    - Source badge: AI Generated, Template, Manual
    - False positive warnings (if AI-generated)
    - "Approve" button (green) - calls useApproveRule, activates rule
    - "Reject" button (red) - opens dialog for required rejection reason
    - Comments textarea for approval notes
    - Show who requested and when (created_by, created_at)
    - Navigation: "Previous" / "Next" pending rule buttons

    **src/app/(dashboard)/rules/page.tsx:**
    - RuleList component as main content
    - Tabs: "All Rules", "Pending Approval" (with count badge from usePendingRules)
    - "Create Rule" dropdown button with options:
      - "AI Generator" -> /rules/new?mode=ai
      - "From Template" -> /rules/new?mode=template
      - "Manual" -> /rules/new?mode=manual
    - Quick stats cards: total rules, active rules, pending approval, by severity

    **src/app/(dashboard)/rules/new/page.tsx:**
    - Query param determines mode: ?mode=ai|template|manual (default: ai)
    - AI mode: RuleGenerator component
    - Template mode: TemplatePicker component
    - Manual mode: RuleForm component
    - Breadcrumb: Rules > Create New Rule
    - Back button to /rules

    **src/app/(dashboard)/rules/[id]/page.tsx:**
    - useRule(id) to fetch rule details
    - If status='pending': show ApprovalPanel
    - If status='active' or 'approved': show rule details card, "Edit" button, validation history link
    - Reasoning section visible if generated_by='ai_recommender'
    - "Run Validation" button to trigger validation with this rule
    - "Disable" / "Enable" toggle for active rules
    - Breadcrumb: Rules > Rule Details
  </action>
  <verify>
    cd frontend && npm run build
    # Check rule components exist
    ls frontend/src/components/features/rules/*.tsx | wc -l
    # Should be 5 (rule-form, rule-list, rule-generator, approval-panel, template-picker)
  </verify>
  <done>
    Rule management pages build successfully. AI generator calls /api/rules/generate and displays reasoning. Approval panel supports approve/reject workflow with comments. Template picker shows industry patterns with parameter configuration.
  </done>
</task>

</tasks>

<verification>
1. `cd frontend && npm run build` succeeds
2. Rule generator component calls /api/rules/generate and displays reasoning
3. Approval panel supports approve/reject with comments
4. Template picker shows categorized templates with parameter config
5. Rules list shows status badges and supports filtering
6. All hooks properly cache and invalidate data
</verification>

<success_criteria>
- User can describe rule in natural language and see generated DQDL with reasoning
- User can pick from industry templates to create rules quickly
- Pending rules queue shows all AI-generated rules awaiting approval
- Approval panel displays reasoning and allows approve/reject with comments
- Rules list displays with status badges and filtering
- AI-01 satisfied: AI can generate rules from natural language (via /api/rules/generate)
- AI-02 satisfied: User can see AI-provided reasoning
- AI-03 satisfied: Industry templates available
</success_criteria>

<output>
After completion, create `.planning/phases/02-data-quality-ai-recommendations/02-03a-SUMMARY.md`
</output>
