# Reproduction: KiCad silkscreen text metrics (#4719)

Related issue: https://github.com/tscircuit/cli/issues/4719

This is a reproduction, not a fix. The 10.4 mm board contains one centered
`SN74LVC1G17DCKR` label with `fontSize={0.8}`.

## Run from the CLI repository root

```sh
bun install --frozen-lockfile
bun test tests/bug-reports/issue-4719-kicad-silkscreen-text.test.ts

# Requires kicad-cli on PATH; tested with KiCad 10.0.0.
RUN_KICAD_DRC=1 bun test tests/bug-reports/issue-4719-kicad-silkscreen-text.test.ts
```

The first test builds the TSX through `tsci build --svgs --kicad-project` and
checks the generated Circuit JSON, SVG font, and KiCad text settings. The
opt-in second test builds the same fixture and runs native KiCad DRC, checking
for `silk_edge_clearance` on this label. It reads the JSON report because DRC
returns exit code zero by default even when violations are found.

These tests deliberately assert the currently affected behavior. They are not
regression tests for a fix; update their expectations when fixing the exporter.
CI does not need KiCad to run the first test.

## Inspect the generated files manually

```sh
bun cli/main.ts build tests/fixtures/assets/issue-4719/index.tsx --svgs --kicad-project
kicad-cli pcb drc --format json --output /tmp/issue-4719-drc.json dist/tests/fixtures/assets/issue-4719/index/kicad/index.kicad_pcb
```

Compare `dist/tests/fixtures/assets/issue-4719/index/pcb.svg` with `dist/tests/fixtures/assets/issue-4719/index/kicad/index.kicad_pcb` in KiCad.
The export contains:

```scheme
(gr_text "SN74LVC1G17DCKR"
  (at 100 100 0)
  (layer F.SilkS)
  ; UUID omitted
  (effects (font (size 0.8 0.8) (thickness 0.15))))
```

Native DRC reports `silk_edge_clearance`, described as **Silkscreen clipped by
board edge**, involving this text and an Edge.Cuts segment. No DRC rules are
lowered or warnings suppressed by this reproduction. The single-label fixture
does not attempt to reproduce the separate text-to-text overlap claim.

## Cause and versions

The SVG uses Arial/sans-serif, while the exporter creates native KiCad text
without matching font metrics. It sets both native size axes to `font_size` and
hard-codes the stroke to 0.15 mm. The affected functions are
`CreateGrTextFromCircuitJson.ts` and `CreateFpTextFromCircuitJson.ts` in
https://github.com/tscircuit/circuit-json-to-kicad/tree/a130496c23f3271aea73d4df2299844b345b81ce/lib/pcb/stages/utils.

Confirmed on CLI 0.1.2064 with its locked `circuit-json-to-kicad` 0.0.181 and
`circuit-to-svg` 0.0.393. A separate converter-level check of exporter 0.0.212
produced the same PCB text settings. KiCad 10.0.0 measured the equivalent
exported label's bounding width as approximately 11.83 mm, exceeding the
10.4 mm board. The issue's `0.6 * fontSize` per character is a width estimate,
not the exact rendered SVG glyph width.
