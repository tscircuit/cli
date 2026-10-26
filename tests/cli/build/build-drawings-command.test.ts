import { expect, test } from "bun:test"
import { writeFile, readFile, symlink, rm } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("build generates named drawing pages in serial and worker modes", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await symlink(
    path.resolve("node_modules"),
    path.join(tmpDir, "node_modules"),
    "dir",
  )
  await writeFile(
    path.join(tmpDir, "carrier.circuit.tsx"),
    `import { assembly } from "@tscircuit/core"; export default () => <board width="30mm" height="20mm" name="carrier"><assembly.drawing.page name="carrier-plan" width="80mm" height="60mm"><assembly.drawing.partview partRef=".carrier" direction="z+" width="60mm" height="40mm" /></assembly.drawing.page></board>`,
  )
  for (const flags of [
    "--drawings",
    "--drawing carrier-plan.svg --concurrency 2",
  ]) {
    await rm(path.join(tmpDir, "dist"), { recursive: true, force: true })
    const result = await runCommand(
      `tsci build ${path.join(tmpDir, "carrier.circuit.tsx")} ${flags} --disable-parts-engine`,
    )
    expect(result.exitCode, result.stderr).toBe(0)
    const svg = await readFile(
      path.join(tmpDir, "dist/carrier/drawings/carrier-plan.svg"),
      "utf8",
    )
    expect(svg).toContain("<svg")
  }
}, 120_000)
