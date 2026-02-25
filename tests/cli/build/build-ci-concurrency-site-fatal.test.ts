import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile, stat } from "node:fs/promises"
import path from "node:path"

const validCircuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
  </board>
)`

test("build --ci --concurrency still generates site output when a parallel build fatally fails", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  const generatorScript = `
const fs = require("node:fs")
const path = require("node:path")

const generatedDir = path.join("lib", "scaffolds", "Demo", "generated")
fs.mkdirSync(generatedDir, { recursive: true })

fs.writeFileSync(
  path.join(generatedDir, "Scaffold_Demo_8x8.tsx"),
  ${JSON.stringify(validCircuitCode)},
)

fs.writeFileSync(
  path.join(generatedDir, "Scaffold_Demo_Fail.tsx"),
  'export default () => { throw new Error("intentional fatal error") }',
)
`

  await writeFile(path.join(tmpDir, "generate.js"), generatorScript)

  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({
      mainEntrypoint: "lib/index.ts",
      previewComponentPath:
        "lib/scaffolds/Demo/generated/Scaffold_Demo_8x8.tsx",
      siteDefaultComponentPath:
        "lib/scaffolds/Demo/generated/Scaffold_Demo_8x8.tsx",
      includeBoardFiles: ["lib/scaffolds/**/generated/*.tsx"],
      alwaysUseLatestTscircuitOnCloud: true,
      prebuildCommand: "node generate.js",
    }),
  )

  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({
      name: "test-build-ci-concurrency-site-fatal",
      version: "1.0.0",
      dependencies: {
        react: "*",
      },
    }),
  )

  const { stderr } = await runCommand("tsci build --ci --concurrency 4")

  expect(stderr).toContain("circuit_generation_failed")

  const indexHtml = await readFile(
    path.join(tmpDir, "dist", "index.html"),
    "utf-8",
  )
  expect(indexHtml).toContain("Scaffold_Demo_8x8")

  const successfulOutputExists = await stat(
    path.join(
      tmpDir,
      "dist",
      "lib/scaffolds/Demo/generated/Scaffold_Demo_8x8",
      "circuit.json",
    ),
  )
    .then(() => true)
    .catch(() => false)

  expect(successfulOutputExists).toBe(true)
}, 60_000)
