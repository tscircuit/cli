# Recommended workflow

1) Start from a known shape
- Prefer a standard template when possible (Arduino Shield, Raspberry Pi HAT, etc.)
- Otherwise use `<board width height>` with explicit dimensions.

2) Establish rails and connectors early
- Decide net names (`net.GND`, `net.VCC`, `net.3V3`, etc.)
- Add power entry (USB-C, barrel jack, header) and protection (fuse/TVS) as appropriate.

3) Search before you model
- Use `tsci search` to find:
  - Suitable footprints
  - Existing registry packages that already wrap a part/module

4) Add/import parts
- Prefer `tsci add <author/pkg>` when a reusable module exists.
- Use `tsci import` when you must bring in a specific component (e.g., supplier part).

5) Make a minimal, working first draft
- Place core IC + passives
- Wire nets using `<trace />`
- Keep schematic readable (use `schX/schY`), even if PCB placement is still rough

6) Iterate with `tsci build`
- Run `tsci build` to validate changes—this is the preferred iteration method for AI-driven development.
- DRC (Design Rule Check) errors can often be ignored during development; focus on connectivity and component placement first.
- Fix connectivity errors first, then placement, then routing.
- Use `tsci dev` only when interactive visual preview is needed (not typical for AI iteration).

7) Stabilize and regression-test
- Use `tsci build` in CI or before sharing.
- Use `tsci snapshot` when you want visual regression checks for PCB/schematic.

8) Export what you need
- `tsci export` for SVG/netlist/DSN/3D/library
- Fabrication zip (Gerbers/BOM/PnP): use the export UI after `tsci dev`
