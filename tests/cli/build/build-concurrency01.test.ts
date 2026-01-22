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

test.skip("build with --concurrency builds multiple files in parallel", async () => {
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
