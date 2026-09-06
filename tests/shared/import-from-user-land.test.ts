import { expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const importerPath = fileURLToPath(
  new URL("../../lib/shared/importFromUserLand.ts", import.meta.url),
)

function importWithNode(options: {
  localEntry?: string
  cliEntry?: string
  moduleName?: string
}) {
  // URL-significant characters also expose this regression on Unix systems.
  const fixtureDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "tsci import # percent% "),
  )
  try {
    const projectDir = path.join(fixtureDir, "project")
    const cliDir = path.join(fixtureDir, "cli")
    fs.mkdirSync(projectDir, { recursive: true })
    fs.mkdirSync(cliDir, { recursive: true })

    for (const { parentDir, entry } of [
      { parentDir: projectDir, entry: options.localEntry },
      { parentDir: cliDir, entry: options.cliEntry },
    ]) {
      if (entry === undefined) continue
      const packageDir = path.join(parentDir, "node_modules", "fixture-module")
      fs.mkdirSync(packageDir, { recursive: true })
      fs.writeFileSync(
        path.join(packageDir, "package.json"),
        JSON.stringify({ name: "fixture-module", main: "index.cjs" }),
      )
      fs.writeFileSync(path.join(packageDir, "index.cjs"), entry)
    }

    // Transpile the actual helper without bundling it. Run in Node without tsx
    // so a loader cannot mask native ESM path/URL resolution behavior.
    const compiledImporterPath = path.join(cliDir, "importer.mjs")
    fs.writeFileSync(
      compiledImporterPath,
      new Bun.Transpiler({ loader: "ts", target: "node" }).transformSync(
        fs.readFileSync(importerPath, "utf8"),
      ),
    )
    const runnerPath = path.join(fixtureDir, "runner.mjs")
    fs.writeFileSync(
      runnerPath,
      `import { importFromUserLand } from ${JSON.stringify(pathToFileURL(compiledImporterPath).href)};
const imported = await importFromUserLand(${JSON.stringify(options.moduleName ?? "fixture-module")}, ${JSON.stringify(projectDir)});
console.log(JSON.stringify({ marker: imported.default?.marker, hasJoin: typeof imported.join === "function" }));
`,
    )
    return spawnSync("node", [runnerPath], {
      encoding: "utf8",
      timeout: 10_000,
    })
  } finally {
    fs.rmSync(fixtureDir, { recursive: true, force: true })
  }
}

test("Node loads the project's dependency from paths containing spaces, # and %", () => {
  const result = importWithNode({
    localEntry: 'module.exports = { marker: "project" }',
    cliEntry: 'module.exports = { marker: "cli" }',
  })
  expect(result.stderr).toBe("")
  expect(result.status).toBe(0)
  expect(JSON.parse(result.stdout).marker).toBe("project")
})

test("Node falls back to the CLI dependency using a file URL", () => {
  const result = importWithNode({
    cliEntry: 'module.exports = { marker: "cli" }',
  })
  expect(result.stderr).toBe("")
  expect(result.status).toBe(0)
  expect(JSON.parse(result.stdout).marker).toBe("cli")
})

test.each(["path", "node:path"])(
  "Node preserves builtin specifier %s",
  (moduleName) => {
    const result = importWithNode({ moduleName })
    expect(result.stderr).toBe("")
    expect(result.status).toBe(0)
    expect(JSON.parse(result.stdout).hasJoin).toBe(true)
  },
)

test("Node propagates project module errors instead of selecting the CLI copy", () => {
  const result = importWithNode({
    localEntry: 'throw new Error("project module failed")',
    cliEntry: 'module.exports = { marker: "cli" }',
  })
  expect(result.status).not.toBe(0)
  expect(result.stderr).toContain("project module failed")
  expect(result.stdout).toBe("")
})
