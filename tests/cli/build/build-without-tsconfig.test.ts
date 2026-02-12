import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile, stat } from "node:fs/promises"
import path from "node:path"

const circuitCode = `
export default () => (
  <board>
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
    <capacitor capacitance="1000pF" footprint="0402" name="C1" schX={-3} pcbX={-3} />
    <trace from=".R1 > .pin1" to=".C1 > .pin1" />
  </board>
)
`

test("build without tsconfig.json auto-generates it and has no type errors", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "index.tsx")
  await writeFile(circuitPath, circuitCode)

  const { stderr } = await runCommand(`tsci build --ci`)

  expect(stderr).not.toContain("TS2339")
  expect(stderr).not.toContain("does not exist on type 'JSX.IntrinsicElements'")

  // Verify transpilation outputs were created
  const esmPath = path.join(tmpDir, "dist", "index.js")
  const esmContent = await readFile(esmPath, "utf-8")
  expect(esmContent).toContain("react/jsx-runtime")
  expect(esmContent).toContain("board")

  const cjsPath = path.join(tmpDir, "dist", "index.cjs")
  const cjsStat = await stat(cjsPath)
  expect(cjsStat.isFile()).toBe(true)

  const dtsPath = path.join(tmpDir, "dist", "index.d.ts")
  const dtsStat = await stat(dtsPath)
  expect(dtsStat.isFile()).toBe(true)
}, 30_000)
