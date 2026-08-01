import { expect, test } from "bun:test"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("build --solver-debug writes schematic solver constructor inputs", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "solver-debug.circuit.tsx")
  await writeFile(
    circuitPath,
    `
      export default () => (
        <board width="12mm" height="8mm" routingDisabled>
          <resistor
            name="R1"
            resistance="1k"
            footprint="0402"
            schX={-2}
            pcbX={-2}
          />
          <led
            name="D1"
            footprint="0603"
            schX={2}
            pcbX={2}
          />
          <trace from=".R1 > .pin2" to=".D1 > .anode" />
        </board>
      )
    `,
  )
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { exitCode, stdout } = await runCommand(
    "tsci build solver-debug.circuit.tsx --solver-debug",
  )

  expect(exitCode).toBe(0)
  expect(stdout).toContain("Solver inputs written to")
  const artifact = JSON.parse(
    await readFile(
      path.join(
        tmpDir,
        "dist",
        "solver-debug",
        "solver-debug",
        "solver-inputs.json",
      ),
      "utf8",
    ),
  )
  expect(artifact.format).toBe("tscircuit_solver_debug_v1")
  expect(artifact.entrypoint).toBe("solver-debug.circuit.tsx")
  const schematicSolver = artifact.solvers.find(
    ({ solver_name }: { solver_name: string }) =>
      solver_name === "SchematicTracePipelineSolver",
  )
  expect(schematicSolver).toBeDefined()
  expect(schematicSolver.constructor_args[0]).toMatchObject({
    chips: expect.any(Array),
    directConnections: expect.any(Array),
    netConnections: expect.any(Array),
  })
})
