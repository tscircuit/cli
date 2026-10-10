# Return-current EM fixture

[explicit-ports.circuit.tsx](./explicit-ports.circuit.tsx) declares a signal connection and separate physical GND terminals using the public `simulation` JSX namespace. The recorded fields come from a fresh Palace v0.14.0 solve on 2026-10-10, using the pinned Docker image in [manifest.json](./recorded/manifest.json).

The run used 1 MHz, a 5 mA peak source, 25 Ω source and 100 Ω load ports, volumetric 35 µm copper, a 0.8 mm FR4 layer separation, first-order FEM, a 2 mm mesh target, 2 mm air padding, four MPI ranks, and 0.1 mm sampling. The actual mesh contains 36,451 tetrahedra; the linear solver converged in three iterations. The 80 × 60 bottom-layer grid contains 4,248 complex sheet-current samples in A/mm and 552 masked cells: eight drill cells and 544 cells outside the GND plane. Local current density, mesh/order/domain convergence, and manufacturing suitability have not been established.

[return-current.test.ts](../../cli/snapshot/return-current.test.ts) normally builds the TSX through `tsci build`, checks the compressed and raw archive hashes against the manifest and the input/model hashes against the solver provenance, exports the recorded FEM fields through `simulate-return-current`, and compares the rendered PCB against the repository SVG snapshot. This path reuses genuine solver data. The [dedicated EM workflow](../../../.github/workflows/return-current-em.yml) sets `TSCI_RUN_RETURN_CURRENT_EM=1` to perform a fresh solve, with no fallback to the recordings. It validates the actual exported complex samples, generates a CLI SVG snapshot, and checks that snapshot again against the same fresh result. Fresh unstructured meshes can differ between runs, so this mode preserves its actual overlay for review rather than comparing different EM solutions against the recorded golden.

To run that fresh integration test locally with Docker and the simulator's Gmsh/VTK Python environment:

```sh
PALACE_PYTHON=/path/venv/bin/python \
TSCI_RUN_RETURN_CURRENT_EM=1 \
TSCI_RETURN_CURRENT_EM_OUTPUT=/abs/work/run \
bun test tests/cli/snapshot/return-current.test.ts
```

The selected output directory retains `result.circuit.json`, `overlay.svg`, and the solver artifacts. [recorded/](./recorded/) contains byte-preserved gzip archives of the actual model, reference fields, and normalized solver input, plus the original configuration, [solver log](./recorded/palace.log), normalization, and port CSVs. The manifest records SHA-256 hashes of both the raw and compressed bytes. These recordings are excluded from formatting to preserve their original bytes. The reference's provenance hashes refer to the decompressed raw model and solver input. JSX Fragment changes altered source-file metadata after the solve; rebuilding the current fixture produces an exactly equal physical model and unchanged terminal IDs.

When replacing the recordings after a validated fresh solve, compress the original files without reserializing JSON:

```sh
return_current_case_dir=/abs/work/run
gzip -n -c "$return_current_case_dir/model.json" > tests/fixtures/return-current/recorded/model.json.gz
gzip -n -c "$return_current_case_dir/reference.json" > tests/fixtures/return-current/recorded/reference.json.gz
gzip -n -c "$return_current_case_dir/circuit.json" > tests/fixtures/return-current/recorded/solver-input.circuit.json.gz
```

Also refresh the manifest, preserved solver evidence, and snapshot. The test checks the raw-byte provenance hashes and the current PCB/terminal geometry before accepting recorded fields.
