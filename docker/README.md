# GSD Secure Sandbox 🛡️

**Zero-Configuration, Total Security Environment for GSD Agents.**

This directory contains the "Space Suit" for running GSD agents without risking your host machine.

## Prerequisites
*   **Docker Desktop** (or Docker Engine).
*   That's it! NO Node.js, NO Python, NO Git required on your host. The container handles everything.

## Features
*   **Total Isolation**: Runs the agent in a disposable Docker container.
*   **Auto-Authentication**: Automatically mounts your `~/.gemini`, `~/.claude`, and `~/.config/opencode` keys.
*   **Smart CLI Auto-Detect 🧠**:
    *   Detects which config you have (Gemini, Claude, or OpenCode).
    *   **Automatically installs the correct CLI** at startup. No manual configuration needed.
*   **Auto-Stack™**: Automatically installs project dependencies at runtime.
    *   System Tools: Add a `` ```gsd-stack `` block to `STACK.md`.
    *   System Tools: Add a `` ```gsd-stack `` block to `STACK.md`.
    *   Node Packages: Add a `` ```gsd-npm `` block to `STACK.md`.
*   **Smart Caching ⚡**: Uses a Docker Volume (`gsd-npm-cache`) to persist NPM packages.
    *   First fun: Downloads internet.
    *   Second run: Instant install from cache.

## 🤖 The "Intelligent" Agent
This PR modifies the **Project Researcher Agent** (`agents/gsd-project-researcher.md`).

**How it works:**
1.  **Detection**: During the `gsd:new-project` research phase, the Agent analyzes requirements to find missing system tools (e.g., "This project needs `ffmpeg` for video processing").
2.  **Structuring**: Instead of just mentioning it in text, it appends a machine-readable block to `STACK.md`:
    ```markdown
    \`\`\`gsd-stack
    ffmpeg
    \`\`\`
3.  **Execution**: When you start `gsd-secure`, the container reads `STACK.md`, finds this block, and runs `apt-get install ffmpeg` automatically before giving you control.

## Usage

### Windows (PowerShell)
1.  Open PowerShell in this directory.
2.  Run the script once to load the aliases:
    ```powershell
    . .\gsd-secure.ps1
    ```
3.  Navigate to your project folder.
4.  Launch the sandbox:
    ```powershell
    gsd-secure
    ```

### Linux / macOS
1.  Source the script in your shell profile (e.g., `.bashrc` or `.zshrc`):
    ```bash
    source /path/to/repo/docker/gsd-secure.sh
    ```
2.  Launch from any project:
    ```bash
    gsd-secure
    ```

## 🔄 Maintenance & Updates

### 1. Adding New Tools (Auto-Stack)
**Normally, the Agent manages this automatically** (writing blocks in `STACK.md`).

However, you can also edit `STACK.md` manually if you need a specific tool immediately. Just add a block like this:

\`\`\`gsd-stack
ffmpeg
\`\`\`

To apply changes (from Agent or Manual):
1.  Type `exit` inside the container.
2.  Run `gsd-secure` again.
The new tools will be installed automatically at startup.

### 2. Full System Update (Rarely Needed)
Your container is built to last. You **ONLY** need to run this when:
*   A new version of GSD is released (e.g., v1.12).
*   You want to update the underlying Linux system.

**Procedure:**
1.  Run `docker rmi gsd-sandbox:latest`
2.  Run `gsd-secure` (this triggers the auto-rebuild)

```bash
# Delete the old image
docker rmi gsd-sandbox:latest

# Start (this will auto-redownload everything)
gsd-secure
```
