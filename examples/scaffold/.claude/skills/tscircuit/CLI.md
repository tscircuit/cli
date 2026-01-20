# tsci CLI primer

Prereqs
- Node.js or Bun
- Install the tscircuit CLI (global install):
  - npm: `npm install -g tscircuit`
  - bun: `bun install --global tscircuit`

Core commands

1) Create / bootstrap a project
- `tsci init` (interactive)
- `tsci init -y` (accept defaults)

Typical output includes:
- `index.tsx` (main circuit entrypoint)
- `package.json`, `tsconfig.json`
- `tscircuit.config.json`

2) Preview locally (interactive)
- `tsci dev`
- Opens a local preview server (commonly https://localhost:3020)
- Note: For AI-driven iteration, prefer `tsci build` over `tsci dev`—dev mode is primarily for interactive visual feedback.

3) Search the ecosystem
- `tsci search "<query>"`
  - Finds footprints and packages

4) Add existing registry packages to your project
- `tsci add <author/pkg>`
  - Example: `tsci add seveibar/PICO_W`
  - Imports look like: `import { PICO_W } from "@tsci/seveibar.PICO_W"`

5) Import components (e.g., from JLCPCB)
- `tsci import <query>`
  - Intended for importing a concrete component into the tscircuit ecosystem

6) Build (generate circuit.json)
- `tsci build` (auto-detects entrypoint)
- `tsci build path/to/file.circuit.tsx`

Notes
- If no path is provided, `tsci build` searches for `index.tsx` or `mainEntrypoint` in `tscircuit.config.json`.
- `*.circuit.tsx` files are built automatically.
- Outputs go to `dist/`.

Useful flags
- `--ignore-errors` (CI/automation)
- `--ignore-warnings`
- `--all-images` (emit PCB/schematic/3D renders into `dist/`)

DRC (Design Rule Check)
- DRC errors are often reported but can frequently be ignored during development.
- Focus on getting the circuit correct first; DRC violations can be addressed later when preparing for manufacturing.

7) Export (SVG/netlist/3D/library)
- `tsci export <file> -f <format>`

Common formats
- `schematic-svg`
- `pcb-svg`
- `readable-netlist`
- `specctra-dsn`
- `gltf` / `glb`
- `kicad-library`

8) Regression snapshots
- `tsci snapshot`
- `tsci snapshot -u` (update)
- `tsci snapshot --3d` (include 3D)

9) Auth / publish
- `tsci login` (browser-based)
- `tsci push` (publish package)
- `tsci auth print-token`

Guidance
- Prefer `tsci --help` and `tsci <cmd> --help` when unsure about flags.
- Avoid `tsci push` unless the user explicitly asks to publish.
