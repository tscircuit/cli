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
    <autoroutingphase phaseIndex={0} pcbTracePaths={savedPaths} />
  </board>
)
```

Copy the generated JSON to `saved-routing.json` (or import the generated path
itself) and supply it to the corresponding phase. Keep the phase's original
selectors and routing options; in particular, keep `autorouter="fanout"` for
fanout escapes. Replay requires a version of tscircuit core that supports
`<autoroutingphase pcbTracePaths={...} />`.

Artifacts contain port selectors and wire/via routes in the enclosing group's
local PCB coordinates, including via dimensions. Files are separated by source
entrypoint, subcircuit, phase, and routing stage. Rebuilding updates the same file
with the latest successful output; copy routes out of `.tscircuit` to keep a
permanent version. No files are created when routing does not run.

Some router outputs, such as junctions that do not correspond to PCB ports or
jumper segments, cannot be represented by the saved-path API. The CLI reports
these phases instead of writing partial or invalid saved paths. Artifact write
failures are warnings and do not fail the circuit build. Browser rendering in
`tsci dev` does not currently use this renderer; run `tsci build` to save routes.
