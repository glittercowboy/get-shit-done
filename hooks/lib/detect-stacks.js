#!/usr/bin/env node
/**
 * detect-stacks.js
 *
 * Detects programming languages, frameworks, and technology stacks in a codebase.
 * Supports 35+ languages with framework-specific detection.
 *
 * Usage:
 *   CLI: node detect-stacks.js [path]
 *   Module: const { detectStacks } = require('./detect-stacks'); await detectStacks(path);
 *
 * Output: JSON with detected stacks, frameworks, file counts, and primary stack
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

// Comprehensive stack marker definitions
const STACK_MARKERS = {
  javascript: {
    name: 'JavaScript',
    markers: ['package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'],
    globs: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    extensions: ['.js', '.mjs', '.cjs'],
    frameworks: {
      react: {
        packageDeps: ['react', 'react-dom'],
        markers: ['.babelrc', 'babel.config.js'],
        patterns: ['import React', 'from "react"', 'from \'react\'']
      },
      vue: {
        packageDeps: ['vue'],
        markers: ['vue.config.js', 'vite.config.js'],
        patterns: ['<template>', 'new Vue(', 'createApp(']
      },
      angular: {
        packageDeps: ['@angular/core'],
        markers: ['angular.json', 'tsconfig.app.json'],
        patterns: ['@Component', '@NgModule']
      },
      nextjs: {
        packageDeps: ['next'],
        markers: ['next.config.js', 'pages/', 'app/'],
        patterns: ['getServerSideProps', 'getStaticProps']
      },
      nuxtjs: {
        packageDeps: ['nuxt'],
        markers: ['nuxt.config.js', 'nuxt.config.ts'],
        patterns: ['export default defineNuxtConfig']
      },
      express: {
        packageDeps: ['express'],
        patterns: ['express()', 'app.listen(', 'app.get(']
      },
      nestjs: {
        packageDeps: ['@nestjs/core'],
        markers: ['nest-cli.json'],
        patterns: ['@Module(', '@Controller(', '@Injectable(']
      },
      svelte: {
        packageDeps: ['svelte'],
        markers: ['svelte.config.js'],
        patterns: ['<script>', '<style>', 'export let']
      },
      gatsby: {
        packageDeps: ['gatsby'],
        markers: ['gatsby-config.js', 'gatsby-node.js']
      },
      electron: {
        packageDeps: ['electron'],
        patterns: ['BrowserWindow', 'ipcMain', 'ipcRenderer']
      }
    }
  },

  typescript: {
    name: 'TypeScript',
    markers: ['tsconfig.json', 'tsconfig.base.json'],
    globs: ['**/*.ts', '**/*.tsx'],
    extensions: ['.ts', '.tsx'],
    frameworks: {
      angular: { packageDeps: ['@angular/core'] },
      nestjs: { packageDeps: ['@nestjs/core'] },
      nextjs: { packageDeps: ['next'] }
    }
  },

  python: {
    name: 'Python',
    markers: ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile', 'poetry.lock'],
    globs: ['**/*.py'],
    extensions: ['.py'],
    frameworks: {
      django: {
        packageDeps: ['Django', 'django'],
        markers: ['manage.py', 'settings.py'],
        patterns: ['from django', 'import django']
      },
      flask: {
        packageDeps: ['Flask', 'flask'],
        patterns: ['from flask import', 'Flask(__name__)']
      },
      fastapi: {
        packageDeps: ['fastapi'],
        patterns: ['from fastapi import', 'FastAPI()']
      },
      pytest: {
        packageDeps: ['pytest'],
        markers: ['pytest.ini', 'conftest.py']
      },
      pandas: {
        packageDeps: ['pandas'],
        patterns: ['import pandas', 'pd.DataFrame']
      },
      tensorflow: {
        packageDeps: ['tensorflow'],
        patterns: ['import tensorflow', 'tf.']
      },
      pytorch: {
        packageDeps: ['torch'],
        patterns: ['import torch', 'torch.nn']
      }
    }
  },

  csharp: {
    name: 'C#',
    markers: ['*.csproj', '*.sln', 'global.json'],
    globs: ['**/*.cs', '**/*.csx'],
    extensions: ['.cs', '.csx'],
    frameworks: {
      aspnet: {
        patterns: ['using Microsoft.AspNetCore', 'WebApplication.Create'],
        markers: ['Program.cs', 'Startup.cs']
      },
      blazor: {
        patterns: ['@page', '@code', 'ComponentBase'],
        markers: ['App.razor', '_Imports.razor']
      },
      entityframework: {
        patterns: ['using Microsoft.EntityFrameworkCore', 'DbContext', 'DbSet<']
      },
      wpf: {
        patterns: ['using System.Windows', 'Application.xaml'],
        markers: ['App.xaml']
      },
      xamarin: {
        patterns: ['using Xamarin.Forms'],
        markers: ['AndroidManifest.xml', 'Info.plist']
      },
      unity: {
        patterns: ['using UnityEngine', 'MonoBehaviour'],
        markers: ['ProjectSettings/', 'Assets/']
      }
    }
  },

  powershell: {
    name: 'PowerShell',
    markers: ['*.psd1', '*.psm1'],
    globs: ['**/*.ps1', '**/*.psm1', '**/*.psd1'],
    extensions: ['.ps1', '.psm1', '.psd1'],
    frameworks: {
      pester: {
        patterns: ['Describe ', 'It ', 'Context ', 'BeforeAll'],
        markers: ['*.Tests.ps1']
      },
      module: {
        markers: ['*.psd1', '*.psm1'],
        patterns: ['Export-ModuleMember', 'FunctionsToExport']
      }
    }
  },

  java: {
    name: 'Java',
    markers: ['pom.xml', 'build.gradle', 'build.gradle.kts', 'settings.gradle'],
    globs: ['**/*.java'],
    extensions: ['.java'],
    frameworks: {
      spring: {
        patterns: ['@SpringBootApplication', 'import org.springframework'],
        markers: ['application.properties', 'application.yml']
      },
      springboot: {
        patterns: ['@SpringBootApplication', '@RestController'],
        markers: ['src/main/resources/application.properties']
      },
      hibernate: {
        patterns: ['@Entity', 'import javax.persistence', 'import jakarta.persistence']
      },
      junit: {
        patterns: ['@Test', 'import org.junit'],
        markers: ['src/test/java/']
      },
      maven: {
        markers: ['pom.xml']
      },
      gradle: {
        markers: ['build.gradle', 'build.gradle.kts']
      }
    }
  },

  kotlin: {
    name: 'Kotlin',
    markers: ['build.gradle.kts', 'settings.gradle.kts'],
    globs: ['**/*.kt', '**/*.kts'],
    extensions: ['.kt', '.kts'],
    frameworks: {
      ktor: {
        patterns: ['import io.ktor', 'embeddedServer(']
      },
      android: {
        markers: ['AndroidManifest.xml', 'res/'],
        patterns: ['import android.', 'import androidx.']
      }
    }
  },

  go: {
    name: 'Go',
    markers: ['go.mod', 'go.sum'],
    globs: ['**/*.go'],
    extensions: ['.go'],
    frameworks: {
      gin: {
        patterns: ['github.com/gin-gonic/gin', 'gin.Default()']
      },
      echo: {
        patterns: ['github.com/labstack/echo', 'echo.New()']
      },
      fiber: {
        patterns: ['github.com/gofiber/fiber', 'fiber.New()']
      },
      gorm: {
        patterns: ['gorm.io/gorm', 'gorm.Open(']
      }
    }
  },

  rust: {
    name: 'Rust',
    markers: ['Cargo.toml', 'Cargo.lock'],
    globs: ['**/*.rs'],
    extensions: ['.rs'],
    frameworks: {
      actix: {
        patterns: ['use actix_web', 'HttpServer::new']
      },
      rocket: {
        patterns: ['use rocket', '#[get(', '#[post(']
      },
      tokio: {
        patterns: ['use tokio', '#[tokio::main]']
      },
      serde: {
        patterns: ['use serde', '#[derive(Serialize']
      }
    }
  },

  ruby: {
    name: 'Ruby',
    markers: ['Gemfile', 'Gemfile.lock', '.ruby-version'],
    globs: ['**/*.rb', '**/*.rake'],
    extensions: ['.rb', '.rake'],
    frameworks: {
      rails: {
        markers: ['config/routes.rb', 'app/controllers/'],
        patterns: ['class ApplicationController', 'Rails.application']
      },
      sinatra: {
        patterns: ['require "sinatra"', 'get \'/']
      },
      rspec: {
        patterns: ['describe ', 'it ', 'expect('],
        markers: ['spec/spec_helper.rb']
      }
    }
  },

  php: {
    name: 'PHP',
    markers: ['composer.json', 'composer.lock'],
    globs: ['**/*.php'],
    extensions: ['.php'],
    frameworks: {
      laravel: {
        markers: ['artisan', 'app/Http/Controllers/'],
        patterns: ['use Illuminate\\', 'Route::']
      },
      symfony: {
        markers: ['bin/console', 'config/services.yaml'],
        patterns: ['use Symfony\\']
      },
      wordpress: {
        markers: ['wp-config.php', 'wp-content/'],
        patterns: ['add_action(', 'add_filter(']
      },
      drupal: {
        markers: ['index.php', 'core/'],
        patterns: ['drupal_', 'Drupal::']
      }
    }
  },

  swift: {
    name: 'Swift',
    markers: ['Package.swift', '*.xcodeproj', '*.xcworkspace'],
    globs: ['**/*.swift'],
    extensions: ['.swift'],
    frameworks: {
      swiftui: {
        patterns: ['import SwiftUI', 'struct.*: View', '@State', '@Binding']
      },
      uikit: {
        patterns: ['import UIKit', 'UIViewController']
      },
      vapor: {
        patterns: ['import Vapor', 'Application(']
      }
    }
  },

  dart: {
    name: 'Dart',
    markers: ['pubspec.yaml', 'pubspec.lock'],
    globs: ['**/*.dart'],
    extensions: ['.dart'],
    frameworks: {
      flutter: {
        patterns: ['import package:flutter', 'StatelessWidget', 'StatefulWidget'],
        markers: ['android/', 'ios/', 'lib/main.dart']
      }
    }
  },

  elixir: {
    name: 'Elixir',
    markers: ['mix.exs', 'mix.lock'],
    globs: ['**/*.ex', '**/*.exs'],
    extensions: ['.ex', '.exs'],
    frameworks: {
      phoenix: {
        patterns: ['use Phoenix.', 'defmodule.*Web'],
        markers: ['lib/*_web/']
      }
    }
  },

  scala: {
    name: 'Scala',
    markers: ['build.sbt', 'build.sc'],
    globs: ['**/*.scala', '**/*.sc'],
    extensions: ['.scala', '.sc'],
    frameworks: {
      akka: {
        patterns: ['import akka.', 'ActorSystem']
      },
      play: {
        markers: ['conf/routes', 'conf/application.conf'],
        patterns: ['import play.api']
      }
    }
  },

  clojure: {
    name: 'Clojure',
    markers: ['project.clj', 'deps.edn', 'build.boot'],
    globs: ['**/*.clj', '**/*.cljs', '**/*.cljc'],
    extensions: ['.clj', '.cljs', '.cljc'],
    frameworks: {
      leiningen: { markers: ['project.clj'] },
      ring: { patterns: ['ring.adapter'] }
    }
  },

  haskell: {
    name: 'Haskell',
    markers: ['*.cabal', 'stack.yaml', 'package.yaml'],
    globs: ['**/*.hs'],
    extensions: ['.hs']
  },

  erlang: {
    name: 'Erlang',
    markers: ['rebar.config', 'rebar.lock'],
    globs: ['**/*.erl', '**/*.hrl'],
    extensions: ['.erl', '.hrl']
  },

  lua: {
    name: 'Lua',
    markers: ['*.rockspec'],
    globs: ['**/*.lua'],
    extensions: ['.lua'],
    frameworks: {
      love2d: { markers: ['main.lua', 'conf.lua'] }
    }
  },

  r: {
    name: 'R',
    markers: ['DESCRIPTION', 'NAMESPACE', '.Rproj'],
    globs: ['**/*.R', '**/*.r'],
    extensions: ['.R', '.r']
  },

  shell: {
    name: 'Shell/Bash',
    markers: ['.bashrc', '.bash_profile', '.zshrc'],
    globs: ['**/*.sh', '**/*.bash', '**/*.zsh'],
    extensions: ['.sh', '.bash', '.zsh']
  },

  perl: {
    name: 'Perl',
    markers: ['Makefile.PL', 'Build.PL', 'cpanfile'],
    globs: ['**/*.pl', '**/*.pm'],
    extensions: ['.pl', '.pm']
  },

  groovy: {
    name: 'Groovy',
    markers: ['build.gradle'],
    globs: ['**/*.groovy', '**/*.gradle'],
    extensions: ['.groovy', '.gradle']
  },

  vb: {
    name: 'Visual Basic',
    markers: ['*.vbproj'],
    globs: ['**/*.vb'],
    extensions: ['.vb']
  },

  fsharp: {
    name: 'F#',
    markers: ['*.fsproj'],
    globs: ['**/*.fs', '**/*.fsx', '**/*.fsi'],
    extensions: ['.fs', '.fsx', '.fsi']
  },

  ocaml: {
    name: 'OCaml',
    markers: ['dune-project', 'dune'],
    globs: ['**/*.ml', '**/*.mli'],
    extensions: ['.ml', '.mli']
  },

  nim: {
    name: 'Nim',
    markers: ['*.nimble'],
    globs: ['**/*.nim'],
    extensions: ['.nim']
  },

  zig: {
    name: 'Zig',
    markers: ['build.zig'],
    globs: ['**/*.zig'],
    extensions: ['.zig']
  },

  solidity: {
    name: 'Solidity',
    markers: ['hardhat.config.js', 'truffle-config.js'],
    globs: ['**/*.sol'],
    extensions: ['.sol'],
    frameworks: {
      hardhat: { markers: ['hardhat.config.js'] },
      truffle: { markers: ['truffle-config.js'] }
    }
  },

  html: {
    name: 'HTML',
    markers: ['index.html'],
    globs: ['**/*.html', '**/*.htm'],
    extensions: ['.html', '.htm']
  },

  css: {
    name: 'CSS',
    markers: ['*.css'],
    globs: ['**/*.css'],
    extensions: ['.css'],
    frameworks: {
      tailwind: {
        markers: ['tailwind.config.js'],
        patterns: ['@tailwind', 'tailwindcss']
      },
      sass: {
        markers: ['*.scss', '*.sass'],
        patterns: ['@import', '@mixin']
      },
      less: {
        markers: ['*.less'],
        patterns: ['@import', '@variable']
      }
    }
  },

  sql: {
    name: 'SQL',
    markers: ['*.sql'],
    globs: ['**/*.sql', '**/*.ddl'],
    extensions: ['.sql', '.ddl']
  },

  makefile: {
    name: 'Make',
    markers: ['Makefile', 'makefile', 'GNUmakefile'],
    globs: ['**/Makefile', '**/makefile'],
    extensions: []
  },

  docker: {
    name: 'Docker',
    markers: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml', '.dockerignore'],
    globs: ['**/Dockerfile*', '**/docker-compose*.yml'],
    extensions: []
  },

  terraform: {
    name: 'Terraform',
    markers: ['*.tf', 'terraform.tfvars'],
    globs: ['**/*.tf', '**/*.tfvars'],
    extensions: ['.tf', '.tfvars']
  }
};

// Common ignore patterns
const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  'vendor',
  'dist',
  'build',
  'target',
  'bin',
  'obj',
  '.vs',
  '.vscode',
  '.idea',
  'coverage',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  'venv',
  '.venv',
  'env',
  '.env',
  'tmp',
  'temp',
  'logs'
];

/**
 * Check if a path should be ignored
 */
function shouldIgnore(filePath) {
  const parts = filePath.split(path.sep);
  return IGNORE_PATTERNS.some(pattern => parts.includes(pattern));
}

/**
 * Recursively walk directory tree
 */
async function* walkDir(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (shouldIgnore(fullPath)) {
        continue;
      }

      if (entry.isDirectory()) {
        yield* walkDir(fullPath);
      } else if (entry.isFile()) {
        yield fullPath;
      }
    }
  } catch (error) {
    // Skip directories we can't read (permissions, etc.)
    if (error.code !== 'EACCES' && error.code !== 'EPERM') {
      console.error(`Error reading directory ${dir}:`, error.message);
    }
  }
}

/**
 * Count files matching extensions
 */
async function countFiles(projectPath, extensions) {
  let count = 0;

  try {
    for await (const file of walkDir(projectPath)) {
      const ext = path.extname(file).toLowerCase();
      if (extensions.includes(ext)) {
        count++;
      }
    }
  } catch (error) {
    console.error('Error counting files:', error.message);
  }

  return count;
}

/**
 * Check if marker files exist
 */
async function checkMarkers(projectPath, markers) {
  const found = [];

  for (const marker of markers) {
    try {
      // Handle glob patterns (e.g., *.csproj)
      if (marker.includes('*')) {
        for await (const file of walkDir(projectPath)) {
          const basename = path.basename(file);
          const markerPattern = marker.replace(/\*/g, '.*');
          const regex = new RegExp(`^${markerPattern}$`);

          if (regex.test(basename)) {
            found.push(file);
            break; // Only need one match
          }
        }
      } else {
        // Direct file check
        const markerPath = path.join(projectPath, marker);
        try {
          await stat(markerPath);
          found.push(markerPath);
        } catch {
          // Marker doesn't exist, continue
        }
      }
    } catch (error) {
      console.error(`Error checking marker ${marker}:`, error.message);
    }
  }

  return found;
}

/**
 * Read package.json dependencies
 */
async function getPackageDependencies(projectPath) {
  try {
    const packagePath = path.join(projectPath, 'package.json');
    const content = await readFile(packagePath, 'utf8');
    const pkg = JSON.parse(content);

    return {
      ...pkg.dependencies || {},
      ...pkg.devDependencies || {}
    };
  } catch {
    return {};
  }
}

/**
 * Read requirements.txt or pyproject.toml dependencies
 */
async function getPythonDependencies(projectPath) {
  const deps = [];

  // Check requirements.txt
  try {
    const reqPath = path.join(projectPath, 'requirements.txt');
    const content = await readFile(reqPath, 'utf8');
    deps.push(...content.split('\n').map(line => line.split(/[=<>]/)[0].trim()).filter(Boolean));
  } catch {
    // Not found
  }

  // Check pyproject.toml
  try {
    const pyprojectPath = path.join(projectPath, 'pyproject.toml');
    const content = await readFile(pyprojectPath, 'utf8');
    // Simple parsing - extract package names from dependencies section
    const depMatch = content.match(/\[tool\.poetry\.dependencies\]([\s\S]*?)(\[|$)/);
    if (depMatch) {
      const depSection = depMatch[1];
      deps.push(...depSection.split('\n').map(line => line.split('=')[0].trim()).filter(Boolean));
    }
  } catch {
    // Not found
  }

  return deps;
}

/**
 * Check for code patterns in sample files
 */
async function checkCodePatterns(projectPath, extensions, patterns, sampleSize = 20) {
  const matches = {};
  let filesChecked = 0;

  try {
    for await (const file of walkDir(projectPath)) {
      if (filesChecked >= sampleSize) break;

      const ext = path.extname(file).toLowerCase();
      if (!extensions.includes(ext)) continue;

      try {
        const content = await readFile(file, 'utf8');

        for (const pattern of patterns) {
          if (content.includes(pattern)) {
            matches[pattern] = (matches[pattern] || 0) + 1;
          }
        }

        filesChecked++;
      } catch {
        // Skip files we can't read
      }
    }
  } catch (error) {
    console.error('Error checking code patterns:', error.message);
  }

  return Object.keys(matches).length > 0 ? matches : null;
}

/**
 * Detect frameworks for a specific stack
 */
async function detectFrameworks(projectPath, stackConfig, stackName) {
  const detectedFrameworks = [];

  if (!stackConfig.frameworks) {
    return detectedFrameworks;
  }

  // Get dependencies based on stack type
  let dependencies = {};
  if (stackName === 'javascript' || stackName === 'typescript') {
    dependencies = await getPackageDependencies(projectPath);
  } else if (stackName === 'python') {
    const pythonDeps = await getPythonDependencies(projectPath);
    dependencies = Object.fromEntries(pythonDeps.map(dep => [dep, true]));
  }

  for (const [fwName, fwConfig] of Object.entries(stackConfig.frameworks)) {
    let detected = false;
    const evidence = [];

    // Check package dependencies
    if (fwConfig.packageDeps) {
      const hasAllDeps = fwConfig.packageDeps.every(dep => dependencies[dep]);
      if (hasAllDeps) {
        detected = true;
        evidence.push(`package dependencies: ${fwConfig.packageDeps.join(', ')}`);
      }
    }

    // Check marker files
    if (fwConfig.markers) {
      const foundMarkers = await checkMarkers(projectPath, fwConfig.markers);
      if (foundMarkers.length > 0) {
        detected = true;
        evidence.push(`markers: ${foundMarkers.map(m => path.basename(m)).join(', ')}`);
      }
    }

    // Check code patterns
    if (fwConfig.patterns && stackConfig.extensions) {
      const patternMatches = await checkCodePatterns(
        projectPath,
        stackConfig.extensions,
        fwConfig.patterns
      );
      if (patternMatches) {
        detected = true;
        evidence.push(`code patterns: ${Object.keys(patternMatches).join(', ')}`);
      }
    }

    if (detected) {
      detectedFrameworks.push({
        name: fwName,
        evidence: evidence
      });
    }
  }

  return detectedFrameworks;
}

/**
 * Main detection function
 */
async function detectStacks(projectPath = '.') {
  const startTime = Date.now();
  const detected = [];

  // Resolve to absolute path
  projectPath = path.resolve(projectPath);

  // Verify path exists
  try {
    const stats = await stat(projectPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path ${projectPath} is not a directory`);
    }
  } catch (error) {
    return {
      error: `Invalid project path: ${error.message}`,
      detected: [],
      primary: null,
      isPolyglot: false,
      duration: Date.now() - startTime
    };
  }

  // Process each stack type
  for (const [stackName, stackConfig] of Object.entries(STACK_MARKERS)) {
    let stackDetected = false;
    const evidence = [];

    // Check for marker files
    const foundMarkers = await checkMarkers(projectPath, stackConfig.markers);
    if (foundMarkers.length > 0) {
      stackDetected = true;
      evidence.push(`markers: ${foundMarkers.map(m => path.basename(m)).join(', ')}`);
    }

    // Count files with relevant extensions
    let fileCount = 0;
    if (stackConfig.extensions && stackConfig.extensions.length > 0) {
      fileCount = await countFiles(projectPath, stackConfig.extensions);
      if (fileCount > 0) {
        stackDetected = true;
        evidence.push(`${fileCount} source files`);
      }
    }

    if (stackDetected) {
      // Detect frameworks for this stack
      const frameworks = await detectFrameworks(projectPath, stackConfig, stackName);

      detected.push({
        stack: stackName,
        name: stackConfig.name,
        fileCount: fileCount,
        evidence: evidence,
        frameworks: frameworks,
        confidence: calculateConfidence(foundMarkers.length, fileCount, frameworks.length)
      });
    }
  }

  // Sort by confidence and file count
  detected.sort((a, b) => {
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    return b.fileCount - a.fileCount;
  });

  const primary = detected.length > 0 ? detected[0].stack : null;
  const isPolyglot = detected.length > 1;

  return {
    projectPath: projectPath,
    detected: detected,
    primary: primary,
    isPolyglot: isPolyglot,
    stackCount: detected.length,
    duration: Date.now() - startTime
  };
}

/**
 * Calculate confidence score (0-100)
 */
function calculateConfidence(markerCount, fileCount, frameworkCount) {
  let confidence = 0;

  // Markers contribute 40%
  confidence += Math.min(markerCount * 20, 40);

  // File count contributes 40%
  if (fileCount > 0) {
    confidence += Math.min(Math.log10(fileCount) * 10, 40);
  }

  // Frameworks contribute 20%
  confidence += Math.min(frameworkCount * 10, 20);

  return Math.round(Math.min(confidence, 100));
}

/**
 * Format output for CLI
 */
function formatOutput(result) {
  if (result.error) {
    return `Error: ${result.error}`;
  }

  let output = `\nStack Detection Results\n`;
  output += `${'='.repeat(50)}\n`;
  output += `Project: ${result.projectPath}\n`;
  output += `Primary Stack: ${result.primary || 'None detected'}\n`;
  output += `Polyglot: ${result.isPolyglot ? 'Yes' : 'No'}\n`;
  output += `Detected Stacks: ${result.stackCount}\n`;
  output += `Duration: ${result.duration}ms\n\n`;

  if (result.detected.length > 0) {
    for (const stack of result.detected) {
      output += `\n${stack.name} (${stack.stack})\n`;
      output += `${'-'.repeat(30)}\n`;
      output += `Confidence: ${stack.confidence}%\n`;
      output += `Files: ${stack.fileCount}\n`;
      output += `Evidence: ${stack.evidence.join(', ')}\n`;

      if (stack.frameworks.length > 0) {
        output += `Frameworks:\n`;
        for (const fw of stack.frameworks) {
          output += `  - ${fw.name}\n`;
          output += `    Evidence: ${fw.evidence.join(', ')}\n`;
        }
      }
    }
  } else {
    output += 'No stacks detected.\n';
  }

  return output;
}

// CLI execution
if (require.main === module) {
  const projectPath = process.argv[2] || '.';
  const outputFormat = process.argv[3] || 'text'; // 'text' or 'json'

  detectStacks(projectPath)
    .then(result => {
      if (outputFormat === 'json') {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatOutput(result));
      }

      // Exit with error code if detection failed
      if (result.error || result.detected.length === 0) {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal error:', error.message);
      console.error(error.stack);
      process.exit(1);
    });
}

// Module exports
module.exports = {
  detectStacks,
  STACK_MARKERS,
  checkMarkers,
  countFiles,
  detectFrameworks,
  getPackageDependencies,
  getPythonDependencies
};
