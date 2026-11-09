# Prebuilt reference designs

Declare `referenceDesigns` in `tscircuit.config.json` with `name`, `displayName`,
`componentPath`, and `chipNames`. Each component exports a Zod object as
`propsSchema`, an object of named `presets`, and its normal default TSX component.
Preset names use snake_case. A preset is a props object; schema defaults are
applied before building. Only declared presets are selectable configurations.

`tsci build` builds every preset into Circuit JSON, PCB and schematic SVGs, and
an assembly GLB. It writes `dist/reference-designs.json` only after all presets
succeed. Circuit errors or invalid props fail the build. A failed rebuild removes
the previous manifest, so incomplete outputs cannot be advertised.

The manifest includes the component path, chip associations, JSON Schema, parsed
props and artifact paths. Circuit JSON and GLB hashes identify the exact artifacts
and allow viewers to reject mismatched mutable builds. Publish the generated dist
files alongside the original TSX using the existing package publishing workflow.

The manifest contract comes from `@tscircuit/reference-designs`, a Zod-only
package published from the RunFrame repository. The CLI's viewer still comes
from `tscircuit`, preserving its compiler and viewer dependency ownership.

See `examples/reference-designs/ne555-timer` for a complete component with three
configurations. Run `tsci build` from that directory to generate its manifest.
