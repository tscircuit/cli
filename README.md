# @tscircuit/snippets-cli

A CLI for developing, managing and publishing snippets on [tscircuit.com](https://tscircuit.com).

## Usage

```bash
# Start a local server that watches for changes in
# this file or it's dependencies and updates the
# browser preview
snippets dev ./path/to/file.tsx
```

> Note: The snippets CLI uses the same configuration files as the [@tscircuit/cli](https://github.com/tscircuit/cli), so you may need to also install `npm install -g @tscircuit/cli` and run `tsci login` to authenticate!

## Installation

```bash
npm install -g @tscircuit/snippets-cli
```

## Development

This command will open the `snippets.tsx` file for editing.

```bash
bun run dev
```

## How it Works

When you run `snippets dev`, we start a local
server that uses the [@tscircuit/file-server](https://github.com/tscircuit/file-server) and [@tscircuit/runframe](https://github.com/tscircuit/runframe) (on the browser)

We use commanderjs to define the CLI commands inside
of `cli/main.ts`

Utility functions are defined in `lib/*`

## Development

### Dynamically Loading Runframe

Use the `RUNFRAME_STANDALONE_FILE_PATH` environment variable to point to the runframe standalone file. You will still need to run `bun run build` inside
runframe each time you'd like to load a new version of runframe.

```bash
export RUNFRAME_STANDALONE_FILE_PATH=../runframe/dist/standalone.min.js
cd ../runframe && bun run build
cd ../snippets-cli && bun run dev
```
