import { test, expect } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import fs from "node:fs"

test("build handles step imports from node_modules packages", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  const dependencyDir = path.join(
    tmpDir,
    "node_modules",
    "@tsci",
    "adom-inc.library",
  )
  const assetsDir = path.join(dependencyDir, "assets")

  await mkdir(assetsDir, { recursive: true })

  await writeFile(
    path.join(dependencyDir, "package.json"),
    JSON.stringify({
      name: "@tsci/adom-inc.library",
      version: "1.0.0",
      type: "module",
      main: "index.js",
    }),
  )

  await writeFile(
    path.join(assetsDir, "MachinePinMediumShort.step"),
    `ISO-10303-21;\nDATA;\n#1=DUMMY();\nENDSEC;\nEND-ISO-10303-21;\n`,
  )

  await writeFile(
    path.join(dependencyDir, "index.js"),
    `import stepUrl from "./assets/MachinePinMediumShort.step"\nexport const modelUrl = stepUrl\n`,
  )

  const circuitPath = path.join(tmpDir, "circuit.tsx")
  await writeFile(
    circuitPath,
    `import { modelUrl } from "@tsci/adom-inc.library"\n\nexport default () => (\n  <board width="20mm" height="20mm">\n    <chip\n      name="U1"\n      footprint="soic8"\n      cadModel={<cadmodel modelUrl={modelUrl} />}\n    />\n  </board>\n)\n`,
  )

  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ type: "module", dependencies: { react: "^19.1.0" } }),
  )

  await runCommand("tsci install")

  const { stderr } = await runCommand(`tsci export ${circuitPath}`)

  expect(stderr).toBe("")

  const outputPath = path.join(tmpDir, "circuit.circuit.json")
  expect(fs.existsSync(outputPath)).toBe(true)
}, 120_000)
