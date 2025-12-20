import { test, expect } from "bun:test"
import path from "node:path"
import { writeFile } from "node:fs/promises"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const entrySource = `export default function ExampleBoard() {
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

const pkgJson = JSON.stringify({ name: "ts-extension-hint-repro" })

test("build hints to rename .ts entry files to .tsx", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const entryPath = path.join(tmpDir, "index.ts")
  await writeFile(entryPath, entrySource)
  await writeFile(path.join(tmpDir, "tsconfig.json"), `${tsconfigJson}\n`)
  await writeFile(path.join(tmpDir, "package.json"), `${pkgJson}\n`)

  const { stderr } = await runCommand("tsci build index.ts")

  expect(stderr).toContain(
    'tscircuit component files must use the ".tsx" extension.',
  )
  expect(stderr).toContain("Try renaming the file to .tsx")
})
