# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is the tscircuit CLI (`@tscircuit/cli`) - the command-line interface for developing, managing, and publishing tscircuit circuit designs. It's essentially "npm for tscircuit".

## Common Commands

```bash
# Development
bun run dev                    # Start dev server with examples/basic/index.circuit.tsx
bun --hot ./cli/main.ts dev <file>  # Run dev server with specific file

# Building
bun run build                  # Build the CLI (runs scripts/bun-build.ts)

# Testing
bun test                       # Run all tests
bun test tests/cli/build/build.test.ts  # Run a single test file
bun test --match "build"       # Run tests matching pattern

# Formatting
bun run format                 # Format with Biome
bun run format:check           # Check formatting

# Local CLI usage
bun ./cli/main.ts <command>    # Run CLI commands during development
```

## Architecture

### Command Structure
CLI commands use Commander.js with a modular registration pattern. Each command lives in `cli/<command>/register.ts` with a `register*` function that attaches to the program object. Main entry is `cli/main.ts`.

### Key Directories
- `cli/` - CLI commands, each in its own directory with `register.ts`
- `lib/` - Shared utility functions and core logic
- `tests/` - Bun test files, organized by feature
- `examples/` - Example circuit files for development

### Dev Server (`tsci dev`)
The dev server uses `@tscircuit/file-server` and `@tscircuit/runframe`. It maintains bidirectional sync:
- Filesystem → Server: Chokidar watches files, syncs via HTTP
- Server → Filesystem: Events polled via `EventsWatcher`
- Binary files (`.glb`, `.png`, `.step`) are base64-encoded
- Dependencies are analyzed via TypeScript AST and uploaded to file server

### Build System
- Uses Bun plugins for static asset imports (`.gltf`, `.step`, `.kicad_mod`)
- Worker pool for parallel builds (`--concurrency` option)
- Outputs: circuit JSON, PNG previews, GLTF 3D models, KiCad projects, static HTML sites

### Configuration
- Project config: `tscircuit.config.json` (Zod validated with JSON schema)
- CLI user config: `Conf` store (XDG-compliant paths)
- Static assets import handling registered via `lib/shared/register-static-asset-loaders.ts`

## Testing

Tests use Bun's test runner with:
- `tests/fixtures/get-cli-test-fixture.ts` - Creates isolated test environment with temp directory and mock registry server
- `tests/fixtures/preload.ts` - Global cleanup handling via `globalThis.deferredCleanupFns`
- `@tscircuit/fake-snippets` - Mock registry API for testing

Test fixture provides:
- `tmpDir` - Isolated temp directory
- `runCommand(cmd)` - Execute CLI commands
- `registryDb` - Direct database access for assertions
- `registryApiUrl` - Test server URL

## Code Style

- Files must use kebab-case naming (enforced by Biome)
- Semicolons: as-needed
- Trailing commas: all
- Path aliases available: `lib/*`, `cli/*`, `tests/*`

## Runtime

The CLI entrypoint (`cli/entrypoint.js`) selects between Bun and tsx as the TypeScript runner, preferring Bun when available. This allows hot-reload during development while maintaining Node.js compatibility.
