import { expect, test } from "bun:test"
import { readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("transpile copies imported .kicad_sym files", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "kicad-symbol-test.tsx")
  const symbolPath = path.join(tmpDir, "test-symbol.kicad_sym")
  const symbolFixturePath = new URL(
    "../../fixtures/assets/test-symbol.kicad_sym",
    import.meta.url,
  )
  const symbolContent = await readFile(symbolFixturePath)

  await writeFile(symbolPath, symbolContent)
  await writeFile(
    circuitPath,
    `
import symbol from "./test-symbol.kicad_sym"

export default () => (
  <board width="10mm" height="10mm">
    <chip name="U1" symbol={symbol} />
  </board>
)
`,
  )
  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({
      type: "module",
      dependencies: { react: "^19.1.0" },
    }),
  )

  await runCommand("tsci install")
  const { exitCode, stderr } = await runCommand(`tsci transpile ${circuitPath}`)
  expect(exitCode).toBe(0)
  expect(stderr).not.toContain("Transpilation failed")

  const assetFiles = await readdir(path.join(tmpDir, "dist", "assets"))
  const copiedSymbol = assetFiles.find((file) => file.endsWith(".kicad_sym"))
  expect(copiedSymbol).toBeDefined()
  expect(
    await readFile(path.join(tmpDir, "dist", "assets", copiedSymbol!)),
  ).toEqual(symbolContent)

  const transpiledOutput = await readFile(
    path.join(tmpDir, "dist", "index.js"),
    "utf8",
  )
  expect(transpiledOutput).toContain("./assets/test-symbol-")
  expect(transpiledOutput).toContain(".kicad_sym")
}, 60_000)
