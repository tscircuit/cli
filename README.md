# tscircuit command line interface (CLI)

A CLI for developing, managing and publishing tscircuit code (the "npm for tscircuit") `npm install -g tscircuit`

https://github.com/user-attachments/assets/0228e09d-48fc-4bf5-814b-762b60fc35c7

## Usage

```bash
# Start a local dev server in your current directory
tsci dev
```

## Installation

```bash
npm install -g tscircuit
```

## CLI USAGE

<!-- START_HELP_OUTPUT -->
```
Usage: tsci [options] [command]

CLI for developing tscircuit packages

Options:
  -h, --help                   display help for command

Commands:
  init [options] [directory]   Initialize a new TSCircuit project in the
                               specified directory (or current directory if none
                               is provided)
  dev [options] [file]         Start development server for a package
  clone [options] [package]    Clone a package from the registry
  push [options] [file]        Save package code to Registry API
  auth                         Login/logout
  login                        Login to tscircuit registry
  logout                       Logout from tscircuit registry
  config                       Manage tscircuit CLI configuration
  export [options] <file>      Export tscircuit code to various formats
  build [options] [file]       Run tscircuit eval and output circuit json
  transpile [file]             Transpile TypeScript/TSX to JavaScript (ESM,
                               CommonJS, and type declarations)
  add <packageSpecs...>        Add tscircuit component packages to your project
  agent [args...]              Install/update and run tsci-agent
  remove <component>           Remove a tscircuit component package from your
                               project
  snapshot [options] [path]    Generate schematic and PCB snapshots (add --3d
                               for 3d preview)
  setup                        Setup utilities like GitHub Actions
  install [packageSpec]        Install project dependencies, or install a
                               specific package (e.g., tsci install
                               https://github.com/espressif/kicad-libraries)
  update [packageSpec]         Update tscircuit component packages to their
                               latest version
  upgrade                      Upgrade CLI to the latest version
  doctor                       Run diagnostic checks for your tscircuit setup
  report                       Report a tscircuit bug
  check [file]                 Partially build and validate circuit artifacts
  registry                     Manage tscircuit registry resources
  search [options] <query...>  Search for footprints, CAD models or packages in
                               the tscircuit ecosystem
  import [options] <query...>  Search JLCPCB or the tscircuit registry and
                               import a component
  convert [options] <file>     Convert .kicad_mod to TSX, or discover a
                               footprinter string with --footprinter
  simulate                     Run a simulation
  version [options]            Print CLI version
  help [command]               display help for command
```
<!-- END_HELP_OUTPUT -->

The `build` command also accepts the following options:

- `--ignore-errors` - continue build even if circuit JSON contains errors
- `--ignore-warnings` - suppress warning output
- `--ignore-netlist-drc` - suppress netlist DRC diagnostics
- `--ignore-pin-specification-drc` - suppress pin-specification DRC diagnostics
- `--ignore-placement-drc` - suppress placement DRC diagnostics
- `--ignore-routing-drc` - suppress routing DRC diagnostics

### KiCad PCM compatibility

`tsci build --kicad-pcm` uses the package license from `package.json` and
selects the oldest compatible PCM schema by default. Licenses accepted by PCM
schema v1 produce a feed for KiCad 6–10. Other non-empty license strings use
schema v2 and require KiCad 10 or newer.

Projects can select a schema or declare a distribution-specific PCM license in
`tscircuit.config.json`:

```json
{
  "kicadPcm": {
    "schemaVersion": "auto",
    "license": "CC-BY-ND-4.0"
  }
}
```

Set `schemaVersion` to `1` or `2` to force a schema. Forcing v1 rejects licenses
that are not in KiCad's v1 license list instead of substituting another license.

### Debug autorouting stages

Use `--autorouter-debug` to log each autorouting stage and write visual
artifacts while the circuit is being routed:

```bash
tsci build index.circuit.tsx \
  --autorouter-debug \
  --autorouter-debug-dir dist/autorouter-debug \
  --autorouter-dump-srj all
```

The debug directory contains:

- `placement-unrouted.png` — PCB placement before routing starts.
- `phase-N-routed.png` — cumulative PCB routing after each zero-indexed stage.
  A fanout router and its downstream router appear as separate stages.
- `phase-N.input.simple-route.json` and `phase-N.output.traces.json` when
  `--autorouter-dump-srj all` is enabled.
- `board.meta.json` — phase timing and connection-count summary, including the
  resolved router, solver pipeline, effort, and cache status/key.

The live stage log prints the same routing metadata, using a compact cache ID
to keep terminal lines readable; artifacts retain the full cache key. This
makes it explicit when a result was computed, reused from the local cache, or
run without caching and records why caching was disabled.

Use `--autorouter-dump-srj failed` to keep only failed-stage routing data, or
`--autorouter-dump-srj phase:N` to capture a single stage.

To submit one of these inputs as an autorouter bug report, log in and pass the
selected input file to `tsci report autorouter`:

```bash
tsci login
tsci report autorouter \
  dist/autorouter-debug/phase-0.input.simple-route.json \
  --title "USB board routing failure"
```

The command uploads only the selected Simple Route JSON and prints a shareable
bug-report URL. Autorouter bug reports are public; the command asks for
confirmation before uploading. Pass `--yes` when running non-interactively.

Use `--autorouter-phase <name>` to enable the debugger automatically and keep
debugging through the named `<autoroutingphase name="..." />`. Later phases
are left out of the debug artifacts.

### Debug solver inputs

Use `--solver-debug` to record the constructor inputs for every solver that
the circuit reports while it renders:

```bash
tsci build index.circuit.tsx \
  --solver-debug \
  --solver-debug-dir dist/solver-debug
```

Each circuit writes a `solver-inputs.json` artifact beneath the debug
directory. The file preserves solver event order, identifies the component
that started each solver, and contains the full constructor argument tuple so
the solver can be reproduced independently. Values that JSON cannot represent
directly, such as `undefined`, `NaN`, maps, sets, or circular references, use
explicit `value_type` records instead of being silently discarded.

## Development

This command will open the `index.tsx` file for editing.

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
