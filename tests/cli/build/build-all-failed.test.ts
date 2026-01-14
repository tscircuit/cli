import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile } from "node:fs/promises"
import path from "node:path"

const validCircuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
  </board>
)`

const invalidCircuitCode = `
export default () => {
  throw new Error("Intentional build failure")
}`

const invalidCircuitCodeSyntax = `
export default ( => {
  return <boawrd></boward>
}`

test("build fails when all circuits fail to build", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await writeFile(path.join(tmpDir, "failing1.circuit.tsx"), invalidCircuitCode)
  await writeFile(
    path.join(tmpDir, "failing2.circuit.tsx"),
    invalidCircuitCodeSyntax,
  )
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { stderr } = await runCommand("tsci build")

  expect(stderr).toContain("All circuits failed to build")
}, 30_000)

test("build succeeds when some circuits pass and some fail", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await writeFile(path.join(tmpDir, "passing.circuit.tsx"), validCircuitCode)
  await writeFile(path.join(tmpDir, "failing.circuit.tsx"), invalidCircuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { stdout, stderr } = await runCommand("tsci build")

  expect(stderr).not.toContain("All circuits failed to build")
  expect(stdout).toContain("1 passed")
  expect(stdout).toContain("1 failed")
}, 30_000)

test("build succeeds when all circuits pass", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await writeFile(path.join(tmpDir, "passing1.circuit.tsx"), validCircuitCode)
  await writeFile(path.join(tmpDir, "passing2.circuit.tsx"), validCircuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { stdout, stderr } = await runCommand("tsci build")

  expect(stderr).not.toContain("All circuits failed to build")
  expect(stdout).toContain("2 passed")
}, 30_000)
