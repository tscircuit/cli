# Prebuilt circuit JSON skips fabrication orientation analysis

Reproduced against CLI 0.1.2077, commit `79a4126dbbde6fe5b4041619e0534801494f8e4b`.

## Run

```sh
bun install --frozen-lockfile
bun test tests/shared/export-snippet-json-orientation-repro.test.ts
```

The regression now passes with metadata enrichment for prebuilt JSON. It calls the real CLI `exportSnippet` handler, generates actual Gerber ZIPs and parses their `pick_and_place.csv` files. No production implementation is mocked or modified. The two tiny SOT-23 footprints face opposite directions. An in-fixture parts engine returns fixed supplier pad geometry, avoiding external requests; an isolated in-memory cache prevents prior supplier results from influencing the test.

## Result

| Component | TSX → Gerbers | TSX → circuit JSON → Gerbers |
| --- | --- | --- |
| Q_PD_ENABLE | 180° | 180° (previously 0°) |
| Q_BUZZER | 0° | 0° |

All three export operations report successful exit status. The ordinary circuit JSON has neither `pin1_location` nor `supplier_pin1_location_map`. Direct TSX fabrication correctly generates and uses the metadata. JSON fabrication silently exports the raw zero-degree component rotation.

The equivalent user workflow is:

```sh
tsci export board.circuit.tsx --format gerbers
tsci export board.circuit.tsx --format circuit-json
tsci export board.circuit.json --format gerbers
```

## Root cause

In `lib/shared/export-snippet.ts`, the circuit-JSON branch reads the file directly. Only the source-file branch enables `enablePartOrientationAnalysis: true` and regenerates the circuit for fabrication. Both paths later invoke the PnP converter with `supplier: "jlcpcb"`; the JSON path has no supplier-frame data for that option to use. The converter silently falls back to `pcb_component.rotation`.

A production fix should enrich or explicitly reject/warn on missing orientation data for supplier fabrication exports. Do not apply a package-wide SOT-23 rotation or copy CAD asset rotations into the CPL. CAD and supplier placement reference frames are independent.

## Scope

The fix enriches prebuilt JSON with local and JLCPCB pin-1 metadata before CPL conversion, without rerendering or changing copper geometry. It reuses existing frames, deduplicates supplier lookups within an export, and skips DNP/test-point components. Missing supplier data or ambiguous bottom-side frames generate named warnings; bottom-side mirroring is not guessed. No registry package or order was changed. Existing orientation-metadata and Gerber drill export tests are run separately as controls.
