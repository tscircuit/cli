The TSX fixtures use `simulation.pcbtransientchannelsimulation`,
`simulation.pcbchannel` and `simulation.ibismodel` imported from `@tscircuit/core`,
with `driverRef`, `receiverRef` and `typical` / `minimum` / `maximum` corners in
both props and source records. Numeric offsets are seconds; UI offsets use
each channel's bit rate. The contract is [RFC #28](https://github.com/tscircuit/rfc/pull/28)
at `89a263537ebc143315849f005024f84c1efa5635`.

Real TI SN74LVC1G04 DBV and SN65HVD72D model bytes are loaded through the
unmocked node adapter. Tests download TI SCEM216C and SLLM183, or use
`TSCI_TEST_IBIS_PATH` and `TSCI_TEST_TRANSCEIVER_IBIS_PATH`; SHA-256 hashes are
checked. Vendor model contents are not redistributed.

Only `runPipeline({ circuitJson, ibisSources, runSolver })` is mocked for CLI
IO tests. Its waveform/RLGC records are validated with Circuit JSON's shared
schemas. Quiet waveforms include undisturbed idle voltages. These samples are
synthetic and do not verify electrical simulation. The CLI writes
`simulationResultCircuitJson` and the pipeline's `files` unchanged, and prints
per-block waveform sample counts and quiet idle voltages. It derives no
measurements. Existing reports are replaced atomically after a successful
write; invalid paths leave the previous report intact.

Rendering depends on unpublished props #995, Circuit JSON #983 and core #5286;
the pipeline options, block and result types depend on pipeline #62. Local dist
overlays are not committed. Native ngspice regressions are excluded by the test-name filter during
solver-free verification; FasterCap, FastHenry and ngspice are never run.

Dependency publication remains pending for `@tscircuit/signal-integrity-pipeline`.
Regenerate bun.lock against the final published artifact before merging. A
frozen install remains blocked on that dependency.
