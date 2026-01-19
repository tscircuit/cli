import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile, stat } from "node:fs/promises"
import path from "node:path"

const circuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
  </board>
)`

test("build with --concurrency 2 builds multiple files in parallel", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Create 4 circuit files
  for (let i = 1; i <= 4; i++) {
    await writeFile(path.join(tmpDir, `circuit${i}.circuit.tsx`), circuitCode)
  }
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { stdout } = await runCommand(`tsci build --concurrency 2`)

  // Verify output mentions concurrency
  expect(stdout).toContain("with concurrency 2")

  // Verify all files were built
  for (let i = 1; i <= 4; i++) {
    const data = await readFile(
      path.join(tmpDir, "dist", `circuit${i}`, "circuit.json"),
      "utf-8",
    )
    const json = JSON.parse(data)
    const component = json.find((c: any) => c.type === "source_component")
    expect(component.name).toBe("R1")
  }
}, 60_000)

test("build with concurrency handles mixed success and failure", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Valid circuit
  await writeFile(path.join(tmpDir, "valid.circuit.tsx"), circuitCode)

  // Invalid circuit (syntax error)
  await writeFile(
    path.join(tmpDir, "invalid.circuit.tsx"),
    `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" // missing closing tag
  </board>
)`,
  )

  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { stdout, stderr } = await runCommand(
    `tsci build --concurrency 2 --ignore-errors`,
  )

  // Valid file should still be built
  const validData = await readFile(
    path.join(tmpDir, "dist", "valid", "circuit.json"),
    "utf-8",
  )
  expect(JSON.parse(validData)).toBeDefined()

  // Should report mixed results
  expect(stdout).toContain("1 passed")
  expect(stdout).toContain("1 failed")
}, 60_000)
