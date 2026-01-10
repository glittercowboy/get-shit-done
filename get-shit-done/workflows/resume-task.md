<trigger>
Use this workflow when:
- User runs /gsd:resume-task
- Need to continue interrupted subagent execution
- Resuming work after session ended mid-plan
</trigger>

<purpose>
Resume an interrupted subagent execution using the Task tool's resume parameter.

Enables seamless continuation of autonomous work that was interrupted by session timeout, user exit, or crash.
</purpose>

<process>

<step name="parse_arguments">
Parse the optional agent_id argument:

```bash
# Check if argument provided
if [ -n "$ARGUMENTS" ]; then
  AGENT_ID="$ARGUMENTS"
  echo "Using provided agent ID: $AGENT_ID"
else
  # Read from current-agent-id.txt
  if [ -f .planning/current-agent-id.txt ] && [ -s .planning/current-agent-id.txt ]; then
    AGENT_ID=$(cat .planning/current-agent-id.txt | tr -d '\n')
    echo "Using current agent ID: $AGENT_ID"
  else
    echo "ERROR: No agent to resume"
    exit 1
  fi
fi
```

**If no agent ID found:**
Present error:
```
No active agent to resume.

There's no interrupted agent recorded. This could mean:
- No subagent was spawned in the current plan
- The last agent completed successfully
- .planning/current-agent-id.txt was cleared

Use /gsd:progress to check project status.
```

**If agent ID found:** Continue to validate_agent step.
</step>

<step name="validate_agent">
Validate the agent exists and is resumable:

```bash
# Check if agent-history.json exists
if [ ! -f .planning/agent-history.json ]; then
  echo "ERROR: No agent history found"
  exit 1
fi

# Read history and find the agent
cat .planning/agent-history.json
```

**Parse agent-history.json and find entry matching AGENT_ID:**

Check the entry status:
- **If status = "completed":** Error - agent already completed
- **If status = "spawned" or "interrupted":** Valid for resume
- **If not found:** Error - agent ID not in history

**If agent already completed:**
```
Agent already completed.

Agent ID: [id]
Completed: [completion_timestamp]
Task: [task_description]

This agent finished successfully. No resume needed.
```

**If agent not found:**
```
Agent ID not found in history.

ID: [provided_id]

Available agents:
- [list most recent 5 agents with status]

Did you mean one of these?
```

**If valid for resume:** Continue to check_conflicts step.
</step>

<step name="check_conflicts">
Check for file modifications since the agent was spawned.

**Read the agent entry to get context:**
- phase, plan, segment information
- timestamp of spawn

**Check for git changes since spawn:**

```bash
# Get files modified since agent spawn
# Note: This is a best-effort check - relies on git status
git status --short
```

**If modifications detected:**

Use AskUserQuestion to warn user:

```
Files modified since agent was interrupted:
- [list files]

These changes may conflict with the agent's work.

Options:
1. Continue anyway - Agent will resume with current files
2. Abort - Review changes first

Select option:
```

Wait for user response.

**If user selects "Abort":**
```
Resume aborted. Review your changes and run /gsd:resume-task when ready.
```
End workflow.

**If user selects "Continue anyway" or no conflicts found:**
Continue to update_status step.
</step>

<step name="update_status">
Update the agent status to "interrupted" if it was "spawned" (marking the interruption point):

```bash
# Read current history
HISTORY=$(cat .planning/agent-history.json)
```

Update the entry in agent-history.json:
- If status was "spawned", change to "interrupted"
- Add note about resume attempt

This provides audit trail of the interruption before resume.
</step>

<step name="resume_agent">
Resume the agent using Task tool's resume parameter:

```
Resuming agent: [agent_id]
Task: [task_description from history]
Phase: [phase]-[plan]

The agent will continue from where it left off...
```

**Use Task tool with resume parameter:**

```
Task(
  description: "Resume interrupted agent",
  prompt: "Continue your previous work. You were executing [task_description].",
  subagent_type: "general-purpose",
  resume: "[AGENT_ID]"
)
```

Wait for agent completion.

**On agent completion:**
- Capture any results returned
- Continue to completion_update step
</step>

<step name="completion_update">
Update tracking files on successful completion:

**1. Update agent-history.json:**

Add new entry marking the resume completion:
```json
{
  "agent_id": "[AGENT_ID]",
  "task_description": "[original task] (resumed)",
  "phase": "[phase]",
  "plan": "[plan]",
  "segment": [segment or null],
  "timestamp": "[now]",
  "status": "completed",
  "completion_timestamp": "[now]"
}
```

**2. Clear current-agent-id.txt:**

```bash
# Clear the current agent file
> .planning/current-agent-id.txt
```

**3. Present completion message:**

```
Agent resumed and completed successfully.

Agent ID: [id]
Task: [task_description]
Original spawn: [original_timestamp]
Completed: [now]

The agent's work has been incorporated. Check git status for changes.
```
</step>

<step name="handle_errors">
Error handling for resume failures:

**If Task tool returns error on resume:**
```
Failed to resume agent.

Agent ID: [id]
Error: [error message]

Possible causes:
- Agent context may have expired
- Agent may have been invalidated

Options:
1. Start fresh - Execute plan from beginning
2. Check status - Review what was completed

Run /gsd:execute-plan to start fresh if needed.
```

Do NOT clear current-agent-id.txt on error - allow retry.
</step>

</process>

<success_criteria>
Resume is complete when:
- [ ] Agent resumed successfully via Task tool resume parameter
- [ ] Agent-history.json updated with completion status
- [ ] Current-agent-id.txt cleared
- [ ] User informed of completion
</success_criteria>
