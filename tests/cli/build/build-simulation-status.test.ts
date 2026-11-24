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

async function buildSimulation(concurrency: number) {
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
  expect(stdout).toContain("TEST_SIMULATOR_FINISHED")
  const circuitJson = JSON.parse(
    await readFile(path.join(tmpDir, "dist", "index", "circuit.json"), "utf8"),
  )
  expect(
    circuitJson.some(
      (element: { type: string }) => element.type === "simulation_experiment",
    ),
  ).toBe(true)

  return stdout
    .replaceAll("\\", "/")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) =>
      /^(Building |Generating circuit JSON|Simulating with |Circuit JSON written|Build complete| {2}(Circuits|Output)|✓ )/.test(
        line,
      ),
    )
    .join("\n")
}

test("build reports simulation status with concurrency 1", async () => {
  expect(await buildSimulation(1)).toMatchInlineSnapshot(`
    "Building 1 file(s)...
    Building index.circuit.tsx...
    Generating circuit JSON...
    Simulating with ngspice...
    Circuit JSON written to dist/index/circuit.json
    Build complete
      Circuits  1 passed
      Output    dist
    ✓ Done"
  `)
}, 30_000)

test("build reports simulation status with concurrency 2", async () => {
  expect(await buildSimulation(2)).toMatchInlineSnapshot(`
    "Building 1 file(s) with concurrency 2...
    Generating circuit JSON for index.circuit.tsx...
    Simulating with ngspice...
    Circuit JSON written to dist/index/circuit.json
    ✓ index.circuit.tsx
    Build complete
      Circuits  1 passed
      Output    dist
    ✓ Done"
  `)
}, 30_000)
