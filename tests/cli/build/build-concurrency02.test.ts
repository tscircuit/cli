import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile } from "node:fs/promises"
import path from "node:path"

const circuitCode = (name: string) => `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="${name}" schX={3} pcbX={3} />
  </board>
)`

test.skip("build without --concurrency defaults to sequential", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await writeFile(path.join(tmpDir, "test.circuit.tsx"), circuitCode("R1"))
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { stdout } = await runCommand("tsci build")

  // Should not show concurrency message
  expect(stdout).not.toContain("with concurrency")

  const data = await readFile(
    path.join(tmpDir, "dist", "test", "circuit.json"),
    "utf-8",
  )
  const json = JSON.parse(data)
  const component = json.find((c: any) => c.type === "source_component")
  expect(component.name).toBe("R1")
}, 30_000)
