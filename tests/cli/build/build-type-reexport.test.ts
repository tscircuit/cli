import { test, expect } from "bun:test"
import path from "node:path"
import { mkdir, writeFile } from "node:fs/promises"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const globalsSource = `export type ExampleType = "foo" | "bar"
export const exampleValue = 1
`

const entrySource = `export { ExampleType } from "./lib/src/globals"

export default function ExampleBoard() {
  return (
    <board width="10mm" height="10mm">
      <resistor name="R1" resistance="1k" footprint="0402" />
    </board>
  )
}
`

const tsconfigJson = JSON.stringify(
  {
    compilerOptions: {
      jsx: "react-jsx",
      module: "ESNext",
      target: "ES2017",
      moduleResolution: "node",
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      strict: true,
      baseUrl: ".",
    },
  },
  null,
  2,
)

const pkgJson = JSON.stringify({ name: "type-reexport-repro" })

test.skip("build fails when re-exporting a type alias without type modifier", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const libDir = path.join(tmpDir, "lib", "src")
  await mkdir(libDir, { recursive: true })
  await writeFile(path.join(libDir, "globals.ts"), globalsSource)
  await writeFile(path.join(tmpDir, "index.tsx"), entrySource)
  await writeFile(path.join(tmpDir, "tsconfig.json"), `${tsconfigJson}\n`)
  await writeFile(path.join(tmpDir, "package.json"), `${pkgJson}\n`)

  const { stderr } = await runCommand("tsci build")

  expect(stderr).toContain("export 'ExampleType' not found")
  expect(stderr).toContain(
    'export type { ExampleType } from "./lib/src/globals"',
  )
})
