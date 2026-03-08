import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, mkdir } from "node:fs/promises"
import path from "node:path"

test("build exits with code 0 when circuit JSON has no errors or warnings", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Create a prebuilt circuit.json with no issues
  const circuitDir = path.join(tmpDir, "examples")
  await mkdir(circuitDir, { recursive: true })
  const circuitJsonPath = path.join(circuitDir, "circuit.json")

  const circuitJson = [
    {
      type: "source_component",
      source_component_id: "sc1",
      name: "R1",
      ftype: "simple_resistor",
    },
  ]

  await writeFile(circuitJsonPath, JSON.stringify(circuitJson, null, 2))
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { exitCode, stdout } = await runCommand(`tsci build ${circuitJsonPath}`)
  expect(exitCode).toBe(0)
  expect(stdout).toContain("Done")
}, 30_000)
