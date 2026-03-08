import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, mkdir } from "node:fs/promises"
import path from "node:path"

test("build exits with code 2 when circuit JSON contains warnings but no errors", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Create a prebuilt circuit.json with a warning element
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
    {
      type: "pcb_placement_warning",
      message: "Component R1 is close to board edge",
      warning_type: "placement_warning",
    },
  ]

  await writeFile(circuitJsonPath, JSON.stringify(circuitJson, null, 2))
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { exitCode, stdout } = await runCommand(`tsci build ${circuitJsonPath}`)
  expect(exitCode).toBe(2)
  expect(stdout).toContain("warnings")
}, 30_000)
