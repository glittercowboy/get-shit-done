#!/usr/bin/env node
// Usage Tracking - PostToolUse Hook
// Captures tool usage and estimates token costs for statusline display

const fs = require('fs');
const path = require('path');

// Token estimation heuristics by tool type
// These are educated guesses based on typical usage patterns
const TOOL_ESTIMATES = {
  Read: { input: 2000, output: 500 },
  Write: { input: 1000, output: 3000 },
  Edit: { input: 2000, output: 2000 },
  Bash: { input: 1500, output: 1000 },
  Grep: { input: 1000, output: 800 },
  Glob: { input: 500, output: 300 },
  Task: { input: 5000, output: 1000 },  // Agent spawning
  WebFetch: { input: 2000, output: 3000 },
  WebSearch: { input: 1500, output: 2000 },
  AskUserQuestion: { input: 1000, output: 500 },
  Default: { input: 1500, output: 1000 }
};

// Read JSON from stdin (standard hook pattern)
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);

    // Skip certain tools that don't consume meaningful tokens
    const skipTools = ['TodoWrite'];
    if (skipTools.includes(data.tool_name)) {
      process.exit(0);
    }

    const planningDir = path.join(process.cwd(), '.planning');
    const usagePath = path.join(planningDir, 'usage.json');

    // Only track if .planning exists (GSD project)
    if (!fs.existsSync(planningDir)) {
      process.exit(0);
    }

    // Load existing usage data
    let usage = {
      sessions: [],
      recent_rate_limits: [],
      current_task: null
    };

    if (fs.existsSync(usagePath)) {
      try {
        usage = JSON.parse(fs.readFileSync(usagePath, 'utf8'));
      } catch (e) {
        // Invalid JSON, start fresh
      }
    }

    // Ensure sessions array exists
    if (!Array.isArray(usage.sessions)) {
      usage.sessions = [];
    }

    // Get current session (last one)
    let session = usage.sessions[usage.sessions.length - 1];

    // Create session if none exists
    if (!session) {
      session = {
        start_time: new Date().toISOString(),
        tasks: []
      };
      usage.sessions.push(session);
    }

    // Ensure tasks array exists
    if (!Array.isArray(session.tasks)) {
      session.tasks = [];
    }

    // Get model from data or use default
    const model = extractModel(data.model?.id || data.model?.display_name || 'sonnet');

    // Get token estimates for this tool
    const toolName = data.tool_name || 'Default';
    const estimates = TOOL_ESTIMATES[toolName] || TOOL_ESTIMATES.Default;

    // Create task entry
    const task = {
      timestamp: new Date().toISOString(),
      tool_name: toolName,
      selected_model: model,
      input_tokens: estimates.input,
      output_tokens: estimates.output
    };

    // Add current task tracking for "current task cost"
    usage.current_task = {
      tool_name: toolName,
      model: model,
      cost: calculateSingleTaskCost(model, estimates.input, estimates.output),
      timestamp: new Date().toISOString()
    };

    session.tasks.push(task);

    // Write updated usage
    fs.writeFileSync(usagePath, JSON.stringify(usage, null, 2));

    process.exit(0);
  } catch (error) {
    // Silent failure - never block Claude
    process.exit(0);
  }
});

/**
 * Extract model name from various formats
 */
function extractModel(modelStr) {
  if (!modelStr) return 'sonnet';

  const lower = modelStr.toLowerCase();
  if (lower.includes('opus')) return 'opus';
  if (lower.includes('sonnet')) return 'sonnet';
  if (lower.includes('haiku')) return 'haiku';

  return 'sonnet'; // Default
}

/**
 * Calculate cost for a single task
 */
function calculateSingleTaskCost(model, inputTokens, outputTokens) {
  const pricing = {
    haiku: { input: 0.25 / 1000000, output: 1.25 / 1000000 },
    sonnet: { input: 3 / 1000000, output: 15 / 1000000 },
    opus: { input: 15 / 1000000, output: 75 / 1000000 }
  };

  const modelPricing = pricing[model] || pricing.sonnet;
  return (inputTokens * modelPricing.input) + (outputTokens * modelPricing.output);
}
