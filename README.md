# tscircuit command line interface (CLI)

A CLI for developing, managing and publishing tscircuit code (the "npm for tscircuit")

## Usage

```bash
# Start a local server that watches for changes in
# this file or it's dependencies and updates the
# browser preview
tsci dev ./path/to/file.tsx

# Clone a snippet from the registry
tsci clone author/snippetName

# Add a component from tscircuit.com
tsci add author/component-name
```

> Note: The snippets CLI uses the same configuration files as the [@tscircuit/cli](https://github.com/tscircuit/cli), so you may need to also install `npm install -g @tscircuit/cli` and run `tsci login` to authenticate!

## Installation

```bash
bun install -g @tscircuit/cli
```

## CLI USAGE

<!-- START_HELP_OUTPUT -->
```
Usage: tsci [options] [command]

CLI for developing tscircuit snippets

Options:
  -V, --version            output the version number
  -h, --help               display help for command

Commands:
  init [directory]         Initialize a new TSCircuit project in the specified
                           directory (or current directory if none is provided)
  dev [options] [file]     Start development server for a snippet
  clone <snippet>          Clone a snippet from the registry
  push [options] [file]    Save snippet code to Registry API
  auth                     Login/logout
  login                    Login to tscircuit registry
  logout                   Logout from tscircuit registry
  config                   Manage tscircuit CLI configuration
  export [options] <file>  Export tscircuit code to various formats
  add <component>          Add a component from tscircuit.com
  help [command]           display help for command
```
<!-- END_HELP_OUTPUT -->

## Development

This command will open the `snippets.tsx` file for editing.

```bash
bun run dev
```

## How it Works

When you run `tsci dev`, we start a local
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
cd ../cli && bun run dev
```
