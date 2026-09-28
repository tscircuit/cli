# Reusing autorouting phase output

`tsci build` automatically saves completed routing phases under
`.tscircuit/autorouting-artifacts/<entrypoint>/`. Commands that generate circuit
JSON through the same CLI renderer (including exports) save these artifacts too.
The terminal prints each saved file's location. No debug flag is required.

Each `*.pcb-trace-paths.json` file is an array ready for `pcbTracePaths`:

```tsx
import savedPaths from "./saved-routing.json"

export default () => (
  <board width={20} height={10}>
    {/* Keep your components and electrical traces here. */}
    <autoroutingphase phaseIndex={19} pcbTracePaths={savedPaths} />
  </board>
)
```

Copy the generated JSON to `saved-routing.json` (or import the generated path
itself) and supply it to the corresponding phase. Keep the phase's original
selectors and routing options; in particular, keep `autorouter="fanout"` for
fanout escapes. The CLI saves core’s emitted `pcbTracePaths` unchanged. Automatic export requires
tscircuit core 0.0.2003 or later (included in `tscircuit@0.0.2647`). If your
project installs an older runtime, update its `tscircuit` dependency; the CLI
warns once when events do not provide exportable paths.

Artifacts contain port selectors and wire/via routes in the enclosing group's
local PCB coordinates, including via dimensions. Files are separated by source
entrypoint, subcircuit, declared phase, execution order, and routing stage.
For example, `subcircuit_0-phase-19-order-0-stage-0.pcb-trace-paths.json`
belongs to `phaseIndex={19}`. The execution order keeps implicit fanout regions
and repeated stages separate, even when their declared phase is `default`. Rebuilding updates the same file
with the latest successful output; copy routes out of `.tscircuit` to keep a
permanent version. A failed or unsupported later build leaves the last successful
files in place; those files are not evidence that the latest build routed successfully.
No files are created when routing does not run.

Some router outputs, such as junctions that do not correspond to PCB ports or
jumper segments, cannot be represented by the saved-path API. The CLI reports
these phases instead of writing partial or invalid saved paths. Artifact write
failures are warnings and do not fail the circuit build. Browser rendering in
`tsci dev` does not currently use this renderer; run `tsci build` to save routes.
