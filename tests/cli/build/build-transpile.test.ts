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

test("build with --transpile generates ESM, CommonJS, and type declarations", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test-circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await runCommand(`tsci build ${circuitPath} --transpile --ignore-errors`)

  // Check that circuit.json was created
  const circuitJsonPath = path.join(
    tmpDir,
    "dist",
    "test-circuit",
    "circuit.json",
  )
  const circuitJsonStat = await stat(circuitJsonPath)
  expect(circuitJsonStat.isFile()).toBe(true)

  // Check that index.js (ESM) was created
  const esmPath = path.join(tmpDir, "dist", "index.js")
  const esmContent = await readFile(esmPath, "utf-8")
  expect(esmContent).toContain("export")
  expect(esmContent).toContain("React.createElement")
  expect(esmContent).toContain("board")

  // Check that index.cjs (CommonJS) was created
  const cjsPath = path.join(tmpDir, "dist", "index.cjs")
  const cjsContent = await readFile(cjsPath, "utf-8")
  expect(cjsContent).toContain("exports")
  expect(cjsContent).toContain("React.createElement")
  expect(cjsContent).toContain("board")

  // Check that index.d.ts (TypeScript types) was created
  const dtsPath = path.join(tmpDir, "dist", "index.d.ts")
  const dtsContent = await readFile(dtsPath, "utf-8")
  expect(dtsContent).toContain("declare")
  expect(dtsContent).toContain("export")
}, 30_000)

test("build with --transpile uses mainEntrypoint when available", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const mainPath = path.join(tmpDir, "index.tsx")
  const otherPath = path.join(tmpDir, "other.circuit.tsx")

  await writeFile(mainPath, circuitCode)
  await writeFile(otherPath, circuitCode)
  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ main: "index.tsx" }),
  )

  await runCommand(`tsci build --transpile --ignore-errors`)

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

test("build with --transpile transforms JSX correctly", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "jsx-test.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await runCommand(`tsci build ${circuitPath} --transpile --ignore-errors`)

  // Check that JSX is transformed to React.createElement() calls
  const esmPath = path.join(tmpDir, "dist", "index.js")
  const esmContent = await readFile(esmPath, "utf-8")
  expect(esmContent).toContain("React.createElement")
  expect(esmContent).not.toContain("<board")
  expect(esmContent).not.toContain("<resistor")

  // Check CommonJS also has transformed JSX
  const cjsPath = path.join(tmpDir, "dist", "index.cjs")
  const cjsContent = await readFile(cjsPath, "utf-8")
  expect(cjsContent).toContain("React.createElement")
  expect(cjsContent).not.toContain("<board")
}, 30_000)

test("build with --transpile JSX with import from other files", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "jsx-test.tsx")
  const pinLabelsPath = path.join(tmpDir, "pinLabels.json")
  await writeFile(
    pinLabelsPath,
    `{
    "pin1": "A1",
    "pin2": "B1",
    "pin3": "C1"
  }`,
  )
  await writeFile(
    circuitPath,
    `
    import pinLabels from "${pinLabelsPath}"
    export default () => (
      <board width="10mm" height="10mm">
        <chip name="U1" pins={pinLabels} />
      </board>
    )
  `,
  )
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await runCommand(`tsci build ${circuitPath} --transpile --ignore-errors`)

  // Check that JSX is transformed to React.createElement() calls
  const esmPath = path.join(tmpDir, "dist", "index.js")
  const esmContent = await readFile(esmPath, "utf-8")
  expect(esmContent).toContain("React.createElement")
  expect(esmContent).not.toContain("<board")
  expect(esmContent).not.toContain("<resistor")

  // Check CommonJS also has transformed JSX
  const cjsPath = path.join(tmpDir, "dist", "index.cjs")
  const cjsContent = await readFile(cjsPath, "utf-8")
  expect(cjsContent).toContain("React.createElement")
  expect(cjsContent).not.toContain("<board")
}, 30_000)
