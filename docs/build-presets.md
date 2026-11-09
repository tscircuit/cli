# Build presets

A regular circuit package can export named props from its TSX entrypoint. `tsci build`
builds the default component and each preset into separate directories in `dist/`.
The package page loads these files through its existing build previews.

```tsx
export const presets = {
  high_resistance: { resistance: "10k" },
  low_resistance: { resistance: "100" },
}

export default ({ resistance = "1k" } = {}) => (
  <board width="10mm" height="10mm">
    <resistor name="R1" resistance={resistance} footprint="0402" />
  </board>
)
```

For `index.circuit.tsx`, `tsci build --glbs --pcb-svgs --schematic-svgs --all-images`
produces:

```text
dist/index/
  circuit.json
  3d.glb
  pcb.svg
  schematic.svg
  high_resistance/
    circuit.json
    3d.glb
    pcb.svg
    schematic.svg
  low_resistance/
    circuit.json
    3d.glb
    pcb.svg
    schematic.svg
```

The default build keeps its existing path. Each preset is a complete build with
the same output options, including GLB, KiCad, STEP, drawings, and static sites.
`--all-images` generates previews for every build. Parallel builds use
`--concurrency` as usual. Source files in subdirectories retain their directory
structure in `dist/`.

Preset names must use snake_case, start with a letter, and have object values.
An optional exported `propsSchema` with a `parse` method validates and defaults
every preset before any builds start. Zod schemas work directly. Output paths
that collide with another entrypoint fail before writing artifacts.

`--inject-props` and `--inject-props-file` continue to request one build with the
supplied props instead of expanding presets. Files without an explicit named
`presets` export keep their existing build behavior.

## Publish and build on tscircuit.com

Copy `examples/build-presets/ne555-timer` into its own package directory. It has
one authored TSX file, a normal `package.json`, and `tscircuit.config.json`.
Install a CLI version with preset support, then run:

```sh
bun install
bunx tscircuit-cli auth login
bun run push
```

The normal cloud job installs the package dependencies, reads
`buildCommand: "bun run build"`, and runs the package's pinned CLI. The existing
build-command recursion guard lets the inner `--ci` build generate artifacts.
The registry stores those outputs on the same package release as the source.

Open the package URL printed by `push`. Its default preview uses
`dist/index/circuit.json`. The existing package build selector can open
`dist/index/slow/circuit.json` and `dist/index/without_led/circuit.json`; each
uses the sibling `3d.glb` for its 3D preview. No runtime props UI is required.

To upload locally generated artifacts instead, run `bun run build` followed by
`bunx tscircuit-cli push --include-dist`. Both paths use the normal package file
APIs. Source imports continue to use the default TSX export and its props.
