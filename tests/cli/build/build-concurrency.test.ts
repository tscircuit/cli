import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile } from "node:fs/promises"
import path from "node:path"

const packageJson = JSON.stringify({
  name: "test-project",
  dependencies: {
    react: "*",
    tscircuit: "*",
  },
})

const circuitCode = (name: string) => `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="${name}" schX={3} pcbX={3} />
  </board>
)`

test("build with --concurrency builds multiple files in parallel", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Create multiple circuit files
  const circuitFiles = [
    "first.circuit.tsx",
    "second.circuit.tsx",
    "third.circuit.tsx",
  ]
  for (const file of circuitFiles) {
    const name = file.replace(".circuit.tsx", "").toUpperCase()
    await writeFile(path.join(tmpDir, file), circuitCode(name))
  }
  await writeFile(path.join(tmpDir, "package.json"), packageJson)
  await runCommand("tsci install")

  const { stdout } = await runCommand("tsci build --concurrency 2")

  // Check that concurrency message is shown
  expect(stdout).toContain("with concurrency 2")

  // Verify all files were built
  for (const file of circuitFiles) {
    const outputDir = file.replace(".circuit.tsx", "")
    const data = await readFile(
      path.join(tmpDir, "dist", outputDir, "circuit.json"),
      "utf-8",
    )
    const json = JSON.parse(data)
    const component = json.find((c: any) => c.type === "source_component")
    expect(component.name).toBe(outputDir.toUpperCase())
  }
}, 60_000)

test("build without --concurrency defaults to sequential", async () => {
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

test("build with --concurrency handles errors correctly", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Create one valid and one invalid circuit file
  await writeFile(path.join(tmpDir, "valid.circuit.tsx"), circuitCode("R1"))
  await writeFile(
    path.join(tmpDir, "invalid.circuit.tsx"),
    "export default () => { throw new Error('intentional error') }",
  )
  await writeFile(path.join(tmpDir, "package.json"), packageJson)

  // Install dependencies so workers can resolve react/tscircuit
  await runCommand("tsci install")

  const { stdout } = await runCommand(
    "tsci build --concurrency 2 --ignore-errors",
  )

  // Valid file should still be built
  const data = await readFile(
    path.join(tmpDir, "dist", "valid", "circuit.json"),
    "utf-8",
  )
  const json = JSON.parse(data)
  const component = json.find((c: any) => c.type === "source_component")
  expect(component.name).toBe("R1")

  // Build should complete (with --ignore-errors)
  expect(stdout).toContain("Build complete")
}, 60_000)
