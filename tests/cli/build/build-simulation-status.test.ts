import { expect, test } from "bun:test"
import { mkdir, readFile, symlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitCode = `
export default () => (
  <board routingDisabled>
    <voltagesource name="V1" voltage="5V" />
    <resistor
      name="R1"
      resistance="1k"
      connections={{ pin1: "V1.pin1", pin2: "V1.pin2" }}
    />
    <analogsimulation duration="1ms" timePerStep="10us" spiceEngine="ngspice" />
  </board>
)
`

const platformConfig = `
export default {
  platformConfig: {
    checkAvailability: false,
    spiceEngineMap: {
      ngspice: {
        async simulate() {
          await new Promise((resolve) => setTimeout(resolve, 50))
          console.log("TEST_SIMULATOR_FINISHED")
          return { simulationResultCircuitJson: [] }
        },
      },
    },
  },
}
`

for (const concurrency of [1, 2]) {
  test(`build reports simulation status with concurrency ${concurrency}`, async () => {
    const { tmpDir, runCommand } = await getCliTestFixture({
      skipSkillSetup: true,
    })
    await mkdir(path.join(tmpDir, "node_modules"))
    await symlink(
      path.dirname(require.resolve("react/package.json")),
      path.join(tmpDir, "node_modules", "react"),
      "dir",
    )
    await writeFile(path.join(tmpDir, "package.json"), "{}")
    await writeFile(path.join(tmpDir, "index.circuit.tsx"), circuitCode)
    await writeFile(path.join(tmpDir, "tscircuit.config.ts"), platformConfig)

    const { stdout, exitCode } = await runCommand(
      `tsci build index.circuit.tsx --disable-pcb --concurrency ${concurrency}`,
    )

    expect(exitCode).toBe(0)
    expect(stdout).toContain("Running ngspice simulation...")
    expect(stdout.indexOf("Running ngspice simulation...")).toBeLessThan(
      stdout.indexOf("Circuit JSON written to"),
    )
    expect(stdout).toContain("TEST_SIMULATOR_FINISHED")
    const circuitJson = JSON.parse(
      await readFile(
        path.join(tmpDir, "dist", "index", "circuit.json"),
        "utf8",
      ),
    )
    expect(
      circuitJson.some(
        (element: { type: string }) => element.type === "simulation_experiment",
      ),
    ).toBe(true)
  }, 30_000)
}
