#!/usr/bin/env node
// Team Plan Detection - SessionStart Hook
// Detects Claude Team accounts and shows one-time warning about rate limits

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read JSON from stdin (standard hook pattern)
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);

    // Only check on startup or resume
    if (!['startup', 'resume'].includes(data.source)) {
      process.exit(0);
    }

    // Check if GSD project is active
    const configPath = path.join(process.cwd(), '.planning', 'config.json');
    if (!fs.existsSync(configPath)) {
      process.exit(0);  // Not a GSD project, skip silently
    }

    // Read config
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    // Check if warning already shown
    if (config.team_plan_warning_shown === true) {
      process.exit(0);  // Already notified, don't spam
    }

    // Detect plan type (if not already detected or if unknown)
    let planType = config.claude_plan_type;

    if (!planType || planType === 'unknown') {
      planType = detectPlanType();

      // Update config with detected plan
      config.claude_plan_type = planType;
      config.team_plan_checked_at = new Date().toISOString();
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }

    // Show warning if team plan detected
    if (planType === 'team') {
      showTeamPlanWarning();

      // Mark as shown
      config.team_plan_warning_shown = true;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }

    process.exit(0);
  } catch (error) {
    // Silent failure - never block Claude
    logDebug(`Team plan check failed: ${error.message}`);
    process.exit(0);
  }
});

/**
 * Detect plan type by checking for environment variables or config indicators
 * Claude Code may expose plan type via environment or session data
 */
function detectPlanType() {
  try {
    // Strategy 1: Check environment variables
    // Claude Code may expose session info via env vars like CLAUDE_TEAM_ACCOUNT
    if (process.env.CLAUDE_TEAM_ACCOUNT === 'true') {
      return 'team';
    }

    // Strategy 2: Try to read from Claude Code config/session files
    // Look for session info in common locations
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const claudeConfigDir = process.env.CLAUDE_CONFIG_DIR || path.join(homeDir, '.claude');

    // Check for session file (this is speculative - may need adjustment)
    const sessionFile = path.join(claudeConfigDir, 'session.json');
    if (fs.existsSync(sessionFile)) {
      const session = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));

      // Look for team account indicators
      if (session.loginMethod && session.loginMethod.includes('Team')) {
        return 'team';
      }
      if (session.accountType === 'team') {
        return 'team';
      }
      if (session.organization) {
        // Presence of organization suggests team account
        return 'team';
      }
    }

    // Strategy 3: Parse from command output (if available)
    // Note: Direct execution of /config may not work in hook context
    // This is kept as a fallback but may not be reliable

    return 'unknown';
  } catch (error) {
    logDebug(`Plan detection failed: ${error.message}`);
    return 'unknown';
  }
}

/**
 * Show one-time team plan warning banner
 */
function showTeamPlanWarning() {
  const banner = `
┌─────────────────────────────────────────────────────────┐
│ ⚠️  GSD Team Plan Notice                                 │
│                                                          │
│ You're using a Claude Team Account with GSD.            │
│                                                          │
│ GSD's multi-agent workflow spawns many subagents which  │
│ may hit team plan rate limits faster than expected.     │
│                                                          │
│ → Run \`/gsd:check-plan\` for details and recommendations │
│ → Run \`/gsd:settings\` to reduce agent usage            │
│                                                          │
│ This message shows once per project.                    │
└─────────────────────────────────────────────────────────┘
`;

  process.stdout.write(banner);
}

/**
 * Optional debug logging (only if GSD_DEBUG env var set)
 */
function logDebug(message) {
  if (process.env.GSD_DEBUG) {
    try {
      const timestamp = new Date().toISOString();
      const logPath = path.join(process.cwd(), '.planning', '.debug.log');
      fs.appendFileSync(logPath, `[${timestamp}] [team-plan-check] ${message}\n`);
    } catch (error) {
      // Even debug logging fails silently
    }
  }
}
