import { expect, test } from "bun:test"
import { execFile } from "node:child_process"
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { promisify } from "node:util"
import { RootCircuit } from "tscircuit"
import { createElement } from "react"

test("compiled CLI renders a saved board through import-only project exports under Node/tsx", async () => {
  const run = promisify(execFile)
  const cliDir = process.cwd()
  const projectDir = await mkdtemp(join(tmpdir(), "node-saved-board-"))
  try {
    await run("bun", ["run", "build"], { cwd: cliDir })
    await symlink(
      join(cliDir, "node_modules"),
      join(projectDir, "node_modules"),
    )
    await writeFile(join(projectDir, "package.json"), '{"type":"module"}')
    const platformConfig = {
      partsEngineDisabled: true,
      schematicDisabled: true,
      routingDisabled: true,
    }
    await writeFile(
      join(projectDir, "tscircuit.config.json"),
      JSON.stringify({ platformConfig }),
    )
    const source = new RootCircuit({ platform: platformConfig })
    source.add(createElement("board", { width: 10, height: 6 }))
    await source.renderUntilSettled()
    const saved = source
      .getCircuitJson()
      .filter((record) => record.type !== "source_project_metadata")
    await writeFile(
      join(projectDir, "saved.circuit.json"),
      JSON.stringify(saved),
    )
    await writeFile(
      join(projectDir, "main.circuit.tsx"),
      `import { ImportedBoard } from "@tscircuit/pcb-spice-pipeline/tsx"
import saved from "./saved.circuit.json"
export default () => <ImportedBoard circuitJson={saved} />`,
    )
    const { stdout } = await run(
      "node",
      [
        "--import",
        import.meta.resolve("tsx"),
        join(cliDir, "dist", "cli", "main.js"),
        "build",
        "main.circuit.tsx",
        "--ignore-errors",
      ],
      {
        cwd: projectDir,
        env: { ...process.env, NODE_ENV: "test", TSCI_TEST_MODE: "true" },
      },
    )
    expect(stdout).toContain("Circuit JSON written")
    const output = JSON.parse(
      await readFile(join(projectDir, "dist", "main", "circuit.json"), "utf8"),
    )
    expect(output.slice(0, saved.length)).toEqual(saved)
    expect(
      output.find((record: any) => record.type === "pcb_board").width,
    ).toBe(10)
  } finally {
    await rm(projectDir, { recursive: true, force: true })
  }
}, 60_000)

test("Node/tsx userland resolution supports hoisting, ESM and require exports, and preserves load errors", async () => {
  const projectDir = await mkdtemp(join(tmpdir(), "node-userland-"))
  try {
    const packageDir = join(projectDir, "node_modules", "react")
    await mkdir(packageDir, { recursive: true })
    await mkdir(join(projectDir, "nested"))
    await writeFile(
      join(packageDir, "package.json"),
      JSON.stringify({
        name: "react",
        type: "module",
        exports: {
          ".": { import: "./esm.mjs", require: "./cjs.cjs" },
          "./adapter": { import: "./esm.mjs" },
          "./require-only": { require: "./cjs.cjs" },
          "./broken": { import: "./broken.cjs" },
        },
      }),
    )
    await writeFile(join(packageDir, "esm.mjs"), 'export default "project ESM"')
    await writeFile(
      join(packageDir, "cjs.cjs"),
      'module.exports = "project CJS"',
    )
    await writeFile(
      join(packageDir, "broken.cjs"),
      'require("./missing-dependency.cjs")',
    )
    const resolver = pathToFileURL(
      join(process.cwd(), "lib/shared/importFromUserLand.ts"),
    ).href
    await promisify(execFile)("node", [
      "--import",
      import.meta.resolve("tsx"),
      "--input-type=module",
      "-e",
      `import assert from "node:assert/strict"
import { importFromUserLand } from ${JSON.stringify(resolver)}
const project = ${JSON.stringify(join(projectDir, "nested"))}
assert.equal((await importFromUserLand("react", project)).default, "project ESM")
assert.equal((await importFromUserLand("react/adapter", project)).default, "project ESM")
assert.equal((await importFromUserLand("react/require-only", project)).default, "project CJS")
assert.equal(typeof (await importFromUserLand("kleur", project)).default.red, "function")
await assert.rejects(importFromUserLand("react/broken", project), { code: "MODULE_NOT_FOUND", message: /missing-dependency/ })
await assert.rejects(importFromUserLand("react/private", project), { code: "ERR_PACKAGE_PATH_NOT_EXPORTED" })`,
    ])
  } finally {
    await rm(projectDir, { recursive: true, force: true })
  }
})
