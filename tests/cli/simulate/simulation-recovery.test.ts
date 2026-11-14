import { expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { runSimulation } from "lib/eecircuit-engine/run-simulation"
import { runSimulationWorker } from "lib/eecircuit-engine/run-simulation-worker"
import { createSimulationReport } from "lib/shared/run-simulation-report"

const healthyNetlist = `Recovery divider
V1 in 0 DC 5
R1 in out 1k
R2 out 0 1k
.tran 1u 5u
.probe v(out)
.end`

test("a timed-out worker cannot write a late result during the next run", async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "simulation-recovery-"),
  )
  const lateWritePath = path.join(directory, "late-result.txt")
  const workerEntrypointPath = path.join(
    import.meta.dir,
    "fixtures/simulation-recovery.worker.ts",
  )
  try {
    const failed = createSimulationReport(
      await runSimulationWorker(
        JSON.stringify({ mode: "timeout", lateWritePath }),
        {
          workerEntrypointPath,
          timeoutMs: 5,
        },
      ),
    )
    const succeeded = createSimulationReport(
      await runSimulationWorker(
        JSON.stringify({ mode: "success", lateWritePath }),
        {
          workerEntrypointPath,
        },
      ),
    )
    expect({
      first: { status: failed.status, errors: failed.diagnostics.errors },
      second: {
        status: succeeded.status,
        errors: succeeded.diagnostics.errors,
        values: succeeded.result?.data[0].values,
      },
      lateResultWritten: existsSync(lateWritePath),
    }).toMatchInlineSnapshot(`
      {
        "first": {
          "errors": [
            "Error: Simulation timed out after 5 ms",
            "Simulation produced no usable finite samples",
          ],
          "status": "failed",
        },
        "lateResultWritten": false,
        "second": {
          "errors": [],
          "status": "success",
          "values": [
            2.5,
          ],
        },
      }
    `)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("real ngspice succeeds after an interrupted long simulation in the same process", async () => {
  const timedOut = createSimulationReport(
    await runSimulation(healthyNetlist.replace(".tran 1u 5u", ".tran 1p 1"), {
      timeoutMs: 1,
    }),
  )
  expect({
    status: timedOut.status,
    errors: timedOut.diagnostics.errors,
  }).toMatchInlineSnapshot(`
    {
      "errors": [
        "Error: Simulation timed out after 1 ms",
        "Simulation produced no usable finite samples",
      ],
      "status": "failed",
    }
  `)
  const recovered = createSimulationReport(await runSimulation(healthyNetlist))
  expect(recovered.status).toBe("success")
  expect(recovered.diagnostics.errors).toEqual([])
  expect(recovered.diagnostics.warnings).toEqual([])
  expect(recovered.netlist).toBe(healthyNetlist)
  expect(recovered.result?.numPoints).toBeGreaterThan(0)
  const voltage = recovered.result?.data.find(
    (series) => series.name === "v(out)",
  )
  expect(voltage?.values.length).toBeGreaterThan(0)
  for (const value of voltage?.values ?? []) expect(value).toBe(2.5)
}, 30000)

test("real ngspice succeeds after a fatal solver error in the same process", async () => {
  const failed = createSimulationReport(
    await runSimulation(healthyNetlist.replace("V1 in 0 DC 5", "V1 0 0 DC 5")),
  )
  expect(failed.status).toBe("failed")
  expect(failed.diagnostics.errors.join("\n")).toMatch(/aborted|shorted VSRC/i)
  const recovered = createSimulationReport(await runSimulation(healthyNetlist))
  expect({
    status: recovered.status,
    errors: recovered.diagnostics.errors,
    warnings: recovered.diagnostics.warnings,
    firstVoltage: recovered.result?.data.find(
      (series) => series.name === "v(out)",
    )?.values[0],
  }).toMatchInlineSnapshot(`
    {
      "errors": [],
      "firstVoltage": 2.5,
      "status": "success",
      "warnings": [],
    }
  `)
}, 30000)
