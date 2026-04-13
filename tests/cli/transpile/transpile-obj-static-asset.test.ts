import { expect, test } from "bun:test"
import { readdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const objCircuitCode = `
import modelUrl from "./part.obj"

export default () => (
  <board width="20mm" height="20mm">
    <chip
      name="U1"
      footprint="soic8"
      cadModel={<cadmodel modelUrl={modelUrl} />}
    />
  </board>
)
`

test("transpile supports .obj static asset imports", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "obj-test.tsx")
  const objPath = path.join(tmpDir, "part.obj")

  const objFileContent = `
o cube
v 0 0 0
v 1 0 0
v 1 1 0
f 1 2 3
`.trim()

  await writeFile(circuitPath, objCircuitCode)
  await writeFile(objPath, objFileContent)
  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({
      type: "module",
      dependencies: {
        react: "^19.1.0",
      },
    }),
  )

  await runCommand("tsci install")
  const { stderr } = await runCommand(`tsci transpile ${circuitPath}`)
  expect(stderr).not.toContain("Transpilation failed")

  const assetFiles = await readdir(path.join(tmpDir, "dist", "assets"))
  const copiedObj = assetFiles.find((file) => file.endsWith(".obj"))
  expect(copiedObj).toBeDefined()

  const transpiledOutput = await readFile(
    path.join(tmpDir, "dist", "index.js"),
    "utf-8",
  )

  expect(transpiledOutput).toContain("./assets/part-")
  expect(transpiledOutput).toContain(".obj")
}, 60_000)
