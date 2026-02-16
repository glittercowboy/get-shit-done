#!/usr/bin/env node
// @ts-check
'use strict';

/**
 * declare-tools.js - CLI entry point for Declare.
 *
 * Subcommand dispatch pattern forked from GSD's gsd-tools.cjs.
 * Bundled via esbuild into dist/declare-tools.cjs for distribution.
 *
 * Usage: node declare-tools.js <command> [args...]
 *
 * Commands:
 *   commit <message> --files <file1> [file2...]  - Atomic git commit for planning docs
 *   init                                          - (stub) Initialize project
 *   status                                        - (stub) Show graph status
 *   help                                          - (stub) Show help
 */

const { commitPlanningDocs } = require('./git/commit');

/**
 * Parse --files flag from argv.
 * Collects everything after --files until next flag (starts with --) or end.
 * @param {string[]} argv
 * @returns {string[]}
 */
function parseFilesFlag(argv) {
  const idx = argv.indexOf('--files');
  if (idx === -1) return [];

  const files = [];
  for (let i = idx + 1; i < argv.length; i++) {
    if (argv[i].startsWith('--')) break;
    files.push(argv[i]);
  }
  return files;
}

/**
 * Main entry point. Dispatches to subcommands.
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(JSON.stringify({ error: 'No command specified. Use: commit, init, status, help' }));
    process.exit(1);
  }

  try {
    switch (command) {
      case 'commit': {
        const message = args[1];
        if (!message) {
          console.log(JSON.stringify({ error: 'commit requires a message argument' }));
          process.exit(1);
        }
        const files = parseFilesFlag(args);
        const cwd = process.cwd();
        const result = commitPlanningDocs(cwd, message, files);
        console.log(JSON.stringify(result));
        process.exit(result.committed || result.reason === 'nothing_to_commit' ? 0 : 1);
        break;
      }

      case 'init':
        console.log(JSON.stringify({ status: 'not_implemented', command: 'init', message: 'Init command not yet implemented (Plan 03)' }));
        break;

      case 'status':
        console.log(JSON.stringify({ status: 'not_implemented', command: 'status', message: 'Status command not yet implemented (Plan 03)' }));
        break;

      case 'help':
        console.log(JSON.stringify({ status: 'not_implemented', command: 'help', message: 'Help command not yet implemented (Plan 03)' }));
        break;

      default:
        console.log(JSON.stringify({ error: `Unknown command: ${command}. Use: commit, init, status, help` }));
        process.exit(1);
    }
  } catch (err) {
    console.log(JSON.stringify({ error: err.message || String(err) }));
    process.exit(1);
  }
}

main();
