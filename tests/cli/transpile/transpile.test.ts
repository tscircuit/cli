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

test("transpile command generates ESM, CommonJS, and type declarations", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test-circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ main: "dist/index.js" }),
  )

  await runCommand(`tsci transpile ${circuitPath}`)

  // Check that index.js (ESM) was created
  const esmPath = path.join(tmpDir, "dist", "index.js")
  const esmContent = await readFile(esmPath, "utf-8")
  expect(esmContent).toContain("export")
  expect(esmContent).toContain("react/jsx-runtime")
  expect(esmContent).toContain("board")

  // Check that index.cjs (CommonJS) was created
  const cjsPath = path.join(tmpDir, "dist", "index.cjs")
  const cjsContent = await readFile(cjsPath, "utf-8")
  expect(cjsContent).toContain("exports")
  expect(cjsContent).toContain("react/jsx-runtime")
  expect(cjsContent).toContain("board")

  // Check that index.d.ts (TypeScript types) was created
  const dtsPath = path.join(tmpDir, "dist", "index.d.ts")
  const dtsContent = await readFile(dtsPath, "utf-8")
  expect(dtsContent).toContain("declare")
  expect(dtsContent).toContain("export")
}, 30_000)

test("transpile uses mainEntrypoint when available", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const mainPath = path.join(tmpDir, "index.tsx")
  const otherPath = path.join(tmpDir, "other.circuit.tsx")

  await writeFile(mainPath, circuitCode)
  await writeFile(otherPath, circuitCode)
  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ main: "dist/index.js" }),
  )

  await runCommand(`tsci transpile`)

  // Check that transpilation outputs exist
  const esmPath = path.join(tmpDir, "dist", "index.js")
  const esmStat = await stat(esmPath)
  expect(esmStat.isFile()).toBe(true)

  const cjsPath = path.join(tmpDir, "dist", "index.cjs")
  const cjsStat = await stat(cjsPath)
  expect(cjsStat.isFile()).toBe(true)

  const dtsPath = path.join(tmpDir, "dist", "index.d.ts")
  const dtsStat = await stat(dtsPath)
  expect(dtsStat.isFile()).toBe(true)
}, 30_000)

test("transpile ignores includeBoardFiles globs in favor of detected entrypoint", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const mainPath = path.join(tmpDir, "index.tsx")
  const globbedPath = path.join(tmpDir, "secondary.circuit.tsx")

  await writeFile(mainPath, "export default 'MAIN_ENTRY_FILE'")
  await writeFile(globbedPath, "export default 'BOARD_FILE_MARKER'")
  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({ includeBoardFiles: ["**/*.circuit.tsx"] }),
  )
  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ main: "dist/index.js" }),
  )

  await runCommand(`tsci transpile`)

  const esmPath = path.join(tmpDir, "dist", "index.js")
  const esmContent = await readFile(esmPath, "utf-8")

  expect(esmContent).toContain("MAIN_ENTRY_FILE")
  expect(esmContent).not.toContain("BOARD_FILE_MARKER")
}, 30_000)

test("transpile throws error when main is outside dist", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const mainPath = path.join(tmpDir, "index.tsx")

  await writeFile(mainPath, circuitCode)
  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ main: "index.tsx" }),
  )

  const { stderr } = await runCommand(`tsci transpile`)

  expect(stderr).toContain(
    'When using transpilation, your package\'s "main" field must point inside the `dist/*` directory, usually to "dist/index.js"',
  )
}, 30_000)

test("transpile throws error when main and exports are not set", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const mainPath = path.join(tmpDir, "index.tsx")

  await writeFile(mainPath, circuitCode)
  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ name: "test-package", version: "1.0.0" }),
  )

  const { stderr } = await runCommand(`tsci transpile`)

  expect(stderr).toContain(
    'When using transpilation, your package.json must have either a "main" or "exports" field',
  )
}, 30_000)

test("transpile transforms JSX correctly", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "jsx-test.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ main: "dist/index.js" }),
  )

  await runCommand(`tsci transpile ${circuitPath}`)

  // Check that JSX is transformed to jsx() calls from react/jsx-runtime
  const esmPath = path.join(tmpDir, "dist", "index.js")
  const esmContent = await readFile(esmPath, "utf-8")
  expect(esmContent).toContain("jsx")
  expect(esmContent).toContain("react/jsx-runtime")
  expect(esmContent).not.toContain("<board")
  expect(esmContent).not.toContain("<resistor")

  // Check CommonJS also has transformed JSX
  const cjsPath = path.join(tmpDir, "dist", "index.cjs")
  const cjsContent = await readFile(cjsPath, "utf-8")
  expect(cjsContent).toContain("jsx")
  expect(cjsContent).toContain("react/jsx-runtime")
  expect(cjsContent).not.toContain("<board")
}, 30_000)
