import { tool } from '@opencode-ai/plugin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const pluginDir = path.dirname(fileURLToPath(import.meta.url));
const seedRoot = path.resolve(pluginDir, '..', 'gsd', 'seed');

function listEntries(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).map(entry => ({
    name: entry.name,
    isDir: entry.isDirectory()
  }));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removeIfExists(targetPath) {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
}

function copyFile(srcPath, destPath) {
  ensureDir(path.dirname(destPath));
  fs.copyFileSync(srcPath, destPath);
}

function copyDirectory(srcDir, destDir) {
  ensureDir(destDir);
  for (const entry of listEntries(srcDir)) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDir) {
      copyDirectory(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  }
}

function installSeed(targetRoot, force) {
  if (!fs.existsSync(seedRoot)) {
    throw new Error(`Seed directory not found: ${seedRoot}`);
  }

  const entries = listEntries(seedRoot);
  const conflicts = [];
  const installed = [];

  for (const entry of entries) {
    const srcPath = path.join(seedRoot, entry.name);
    const destPath = path.join(targetRoot, entry.name);

    if (fs.existsSync(destPath)) {
      if (!force) {
        conflicts.push(path.relative(targetRoot, destPath));
        continue;
      }
      removeIfExists(destPath);
    }

    if (entry.isDir) {
      copyDirectory(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
    installed.push(path.relative(targetRoot, destPath));
  }

  if (conflicts.length > 0) {
    throw new Error(
      `Install blocked by existing paths. Re-run with force: true to overwrite: ${conflicts.join(', ')}`
    );
  }

  return installed;
}

export const GsdInstaller = async ({ directory, worktree }) => {
  const targetRoot = worktree || directory;

  return {
    tool: {
      gsd_install: tool({
        description: 'Install GSD OpenCode assets into the current project.',
        args: {
          force: tool.schema.boolean().optional(),
        },
        async execute(args) {
          const force = Boolean(args.force);
          const installed = installSeed(targetRoot, force);
          return [
            'GSD OpenCode assets installed.',
            `Target: ${targetRoot}`,
            `Paths: ${installed.join(', ') || '(none)'}`
          ].join('\n');
        }
      })
    }
  };
};
