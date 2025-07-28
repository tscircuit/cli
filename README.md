# tscircuit command line interface (CLI)

A CLI for developing, managing and publishing tscircuit code (the "npm for tscircuit")

https://github.com/user-attachments/assets/0228e09d-48fc-4bf5-814b-762b60fc35c7

## Usage

The CLI installed from `@tscircuit/cli` exposes the `tscircuit-cli` command. The
shorter `tsci` alias is provided by the `tscircuit` package.

```bash
# Start a local server that watches for changes in
# this file or it's dependencies and updates the
# browser preview
tscircuit-cli dev ./path/to/file.tsx

# Clone a package from the registry
tscircuit-cli clone author/packageName

# Add a component from tscircuit.com
tscircuit-cli add author/component-name
```

> Note: The packages CLI uses the same configuration files as the
> [@tscircuit/cli](https://github.com/tscircuit/cli), so you may need to also
> install `npm install -g @tscircuit/cli` and run `tscircuit-cli login` to
> authenticate! If you have the `tscircuit` package installed globally you can
> instead use `tsci`.

## Installation

```bash
npm install -g @tscircuit/cli
```

## CLI USAGE

<!-- START_HELP_OUTPUT -->
```
Usage: tscircuit-cli [options] [command]

CLI for developing tscircuit packages

Options:
  -h, --help                  display help for command

Commands:
  init [options] [directory]  Initialize a new TSCircuit project in the
                              specified directory (or current directory if none
                              is provided)
  dev [options] [file]        Start development server for a package
  clone [options] <package>   Clone a package from the registry
  push [options] [file]       Save snippet code to Registry API
  auth                        Login/logout
  login                       Login to tscircuit registry
  logout                      Logout from tscircuit registry
  config                      Manage tscircuit CLI configuration
  export [options] <file>     Export tscircuit code to various formats
  build [options] [file]      Run tscircuit eval and output circuit json
  add <component>             Add a tscircuit component package to your project
  remove <component>          Remove a tscircuit component package from your
                              project
  snapshot [options] [file]   Generate schematic and PCB snapshots (add --3d for
                              3d preview)
  setup                       Setup utilities like GitHub Actions
  upgrade                     Upgrade CLI to the latest version
  search <query>              Search for packages in the tscircuit registry
  import <query>              Search JLCPCB or the tscircuit registry and import
                              a component
  version                     Print CLI version
  help [command]              display help for command
```
<!-- END_HELP_OUTPUT -->

The `build` command also accepts the following options:

- `--ignore-errors` - continue build even if circuit JSON contains errors
- `--ignore-warnings` - suppress warning output

## Development

This command will open the `index.tsx` file for editing.

```bash
bun run dev
```

## How it Works

When you run `tscircuit-cli dev` (or `tsci dev` if the `tscircuit` package is installed), we start a local
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
