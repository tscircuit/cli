import { test, expect } from "bun:test"
import { readFile, symlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("transpile bundles dependencies except for tscircuit", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "with-deps.ts")

  await writeFile(
    circuitPath,
    `import kleur from "kleur"
import * as tscircuit from "tscircuit"

export const coloredText = kleur.red("ok")
export const usesTscircuit = () =>
  typeof tscircuit === "object" ? "tscircuit-present" : "missing"
`,
  )

  await writeFile(path.join(tmpDir, "package.json"), "{}")

  await symlink(
    path.resolve(process.cwd(), "node_modules"),
    path.join(tmpDir, "node_modules"),
    "dir",
  )

  await runCommand(`tsci transpile ${circuitPath}`)

  const esmPath = path.join(tmpDir, "dist", "index.js")
  const esmContent = await readFile(esmPath, "utf-8")

  expect(esmContent).toMatch(/from ['\"]tscircuit['\"]/)
  expect(esmContent).not.toContain('from "kleur"')
  expect(esmContent).not.toContain('require("kleur")')
  expect(esmContent).toContain("tscircuit-present")
}, 30_000)
