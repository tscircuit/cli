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

test("build without package.json creates dist in cwd, not at root", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test-circuit.circuit.tsx")

  // Write only the circuit file - NO package.json
  await writeFile(circuitPath, circuitCode)

  // This should NOT fail with "EROFS: read-only file system, mkdir '/dist'"
  // Instead, it should create dist in tmpDir
  const { exitCode, stderr } = await runCommand(
    `tsci build ./test-circuit.circuit.tsx`,
  )

  // Verify we don't get the root filesystem error
  expect(stderr).not.toContain("EROFS")
  expect(stderr).not.toContain("mkdir '/dist'")

  // The build should succeed and create dist in the correct location
  expect(exitCode).toBe(0)

  // Verify the output was created in tmpDir/dist, not /dist
  const outputPath = path.join(tmpDir, "dist", "test-circuit", "circuit.json")
  const outputStat = await stat(outputPath)
  expect(outputStat.isFile()).toBe(true)

  // Verify the content is valid
  const data = await readFile(outputPath, "utf-8")
  const json = JSON.parse(data)
  const component = json.find((c: any) => c.type === "source_component")
  expect(component.name).toBe("R1")
}, 30_000)

test("build with file path in subdirectory without package.json uses cwd", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const { mkdir } = await import("node:fs/promises")

  // Create a subdirectory structure without any package.json
  const subDir = path.join(tmpDir, "src", "circuits")
  await mkdir(subDir, { recursive: true })

  const circuitPath = path.join(subDir, "my-board.circuit.tsx")
  await writeFile(circuitPath, circuitCode)

  // Build the file using a relative path
  const { exitCode, stderr } = await runCommand(
    `tsci build ./src/circuits/my-board.circuit.tsx`,
  )

  // Verify no root filesystem error
  expect(stderr).not.toContain("EROFS")
  expect(stderr).not.toContain("mkdir '/dist'")

  expect(exitCode).toBe(0)

  // Output should be in tmpDir/dist
  const outputPath = path.join(
    tmpDir,
    "dist",
    "src",
    "circuits",
    "my-board",
    "circuit.json",
  )
  const outputStat = await stat(outputPath)
  expect(outputStat.isFile()).toBe(true)
}, 30_000)
