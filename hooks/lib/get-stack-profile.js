#!/usr/bin/env node
/**
 * get-stack-profile.js
 * Extracts a specific stack's profile from stack-profiles.yaml as JSON.
 *
 * Usage:
 *   CLI: node get-stack-profile.js typescript
 *   Module: const { getStackProfile } = require('./get-stack-profile');
 */

const fs = require('fs');
const path = require('path');

const PROFILES_PATH = path.join(__dirname, 'stack-profiles.yaml');

// Try to load js-yaml, fallback to simple parser
let yaml;
try {
  yaml = require('js-yaml');
} catch {
  // Will be handled in fallback logic below
  yaml = null;
}

/**
 * Simple YAML parser for stack-profiles.yaml structure
 * This is a fallback when js-yaml is not installed
 */
function simpleYamlParse(content) {
  const profiles = {};
  let currentStack = null;
  let currentKey = null;
  let indent = 0;

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Detect indentation
    const leadingSpaces = line.match(/^ */)[0].length;

    // Top-level stack ID (no indentation)
    if (leadingSpaces === 0 && trimmed.endsWith(':')) {
      currentStack = trimmed.slice(0, -1);
      profiles[currentStack] = {};
      indent = 0;
      continue;
    }

    // Stack properties (2 spaces)
    if (leadingSpaces === 2 && currentStack) {
      const match = trimmed.match(/^([^:]+):\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        currentKey = key;

        if (value) {
          // Inline value
          if (value.startsWith('[')) {
            // Array
            profiles[currentStack][key] = JSON.parse(value.replace(/'/g, '"'));
          } else if (value === 'true') {
            profiles[currentStack][key] = true;
          } else if (value === 'false') {
            profiles[currentStack][key] = false;
          } else if (!isNaN(value)) {
            profiles[currentStack][key] = Number(value);
          } else {
            profiles[currentStack][key] = value.replace(/^["']|["']$/g, '');
          }
        } else {
          // Multi-line value (array or object)
          profiles[currentStack][key] = [];
        }
      }
      continue;
    }

    // Array items (4+ spaces)
    if (leadingSpaces >= 4 && currentStack && currentKey) {
      if (trimmed.startsWith('- ')) {
        const value = trimmed.slice(2).replace(/^["']|["']$/g, '');
        if (Array.isArray(profiles[currentStack][currentKey])) {
          profiles[currentStack][currentKey].push(value);
        }
      }
    }
  }

  return profiles;
}

/**
 * Get stack profile from YAML file
 */
function getStackProfile(stackId) {
  // Check if profiles file exists
  if (!fs.existsSync(PROFILES_PATH)) {
    throw new Error(`Stack profiles file not found: ${PROFILES_PATH}`);
  }

  const content = fs.readFileSync(PROFILES_PATH, 'utf8');

  // Parse YAML
  let profiles;
  if (yaml && yaml.load) {
    // Use js-yaml if available
    profiles = yaml.load(content);
  } else {
    // Fallback to simple parser
    if (!yaml) {
      console.warn('Warning: js-yaml not found. Using simplified YAML parser.');
      console.warn('For full YAML support, install: npm install -g js-yaml');
    }
    profiles = simpleYamlParse(content);
  }

  if (!profiles[stackId]) {
    const available = Object.keys(profiles).join(', ');
    throw new Error(`Unknown stack: ${stackId}. Available: ${available}`);
  }

  return profiles[stackId];
}

// CLI interface
if (require.main === module) {
  const stackId = process.argv[2];
  if (!stackId) {
    console.error('Usage: node get-stack-profile.js <stack-id>');
    console.error('');
    console.error('Example: node get-stack-profile.js typescript');
    process.exit(1);
  }

  try {
    const profile = getStackProfile(stackId);
    console.log(JSON.stringify(profile, null, 2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = { getStackProfile };
