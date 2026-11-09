The TSX fixtures use `signalintegrity.simulation`, `signalintegrity.signal` and
`signalintegrity.ibismodel` imported from `@tscircuit/core`, with `driverRef`,
`receiverRef`, `strobeRef` and spelled-out authoring corners. Serialized
Circuit JSON names, fields and abbreviated corner data remain unchanged.

The TSX fixtures use real TI SN74LVC1G04 DBV and SN65HVD72D models. The
SN65HVD72 D and /RE inputs receive data and strobe on the same chip.
Tests download https://www.ti.com/lit/zip/scem216c and
https://www.ti.com/lit/zip/sllm183, or copy `TSCI_TEST_IBIS_PATH` and
`TSCI_TEST_TRANSCEIVER_IBIS_PATH`. Both SHA-256 hashes are checked. Vendor
IBIS contents are not redistributed in this repository.

Only `runPipeline({ circuitJson, ibisSources, runSolver })` is mocked in
formatting tests. It accepts real IBIS bytes loaded by the unmocked `/node`
adapter and returns a typed `PipelineResult`, with per-block records in
`blocks[].results` and source plus result records in
`simulationResultCircuitJson`. Metrics are synthetic formatting fixtures.
The empty-result/ngspice regression also runs with the real pipeline.

The final RFC is https://github.com/tscircuit/rfc/pull/28 at
`d79a8d14d40765b2dda7db557e45e101f2aa62ba`. Rendering requires the unpublished
props #995, circuit-json #983 and core #5286 branches. The pipeline API
requires signal-integrity-pipeline #62. Local sibling builds may be overlaid
in `node_modules` for verification; local links are not committed.

Dependency publication is still pending: npm returns 404 for
`@tscircuit/signal-integrity-pipeline@^0.1.0`. The available GitHub release
v0.1.11 predates the final API (it has no `blocks`), so it cannot substitute
for #62. The dependency remains declared in package.json. bun.lock omits an
unresolved root entry so it remains parseable; regenerate it against the
final published artifact before merging. A frozen install currently stops
on the missing package, rather than an invalid lockfile.
