import { expect, test } from "bun:test"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { temporaryDirectory } from "tempy"

test("entrypoint uses local version by default when available", async () => {
  const tmpDir = temporaryDirectory()
  const localCliPath = join(tmpDir, "node_modules", "@tscircuit", "cli")

  mkdirSync(localCliPath, { recursive: true })
  mkdirSync(join(localCliPath, "dist"), { recursive: true })

  writeFileSync(
    join(tmpDir, "package.json"),
    JSON.stringify({ name: "test-project", version: "1.0.0" }),
  )

  writeFileSync(
    join(localCliPath, "package.json"),
    JSON.stringify({ name: "@tscircuit/cli", version: "0.0.999-local" }),
  )

  writeFileSync(
    join(localCliPath, "dist", "main.js"),
    'console.log("LOCAL_CLI_EXECUTED")',
  )

  const entrypointPath = resolve(process.cwd(), "cli/entrypoint.js")

  const result = spawnSync("bun", [entrypointPath, "--version"], {
    cwd: tmpDir,
    encoding: "utf-8",
  })

  const output = result.stdout + result.stderr

  expect(output).toContain("Using local @tscircuit/cli v0.0.999-local")

  rmSync(tmpDir, { recursive: true, force: true })
})

test("entrypoint skips local version when --use-global flag is passed", async () => {
  const tmpDir = temporaryDirectory()
  const localCliPath = join(tmpDir, "node_modules", "@tscircuit", "cli")

  mkdirSync(localCliPath, { recursive: true })
  mkdirSync(join(localCliPath, "dist"), { recursive: true })

  writeFileSync(
    join(tmpDir, "package.json"),
    JSON.stringify({ name: "test-project", version: "1.0.0" }),
  )

  writeFileSync(
    join(localCliPath, "package.json"),
    JSON.stringify({ name: "@tscircuit/cli", version: "0.0.999-local" }),
  )

  writeFileSync(
    join(localCliPath, "dist", "main.js"),
    'console.log("LOCAL_CLI_EXECUTED")',
  )

  const entrypointPath = resolve(process.cwd(), "cli/entrypoint.js")

  const result = spawnSync(
    "bun",
    [entrypointPath, "--use-global", "--version"],
    {
      cwd: tmpDir,
      encoding: "utf-8",
    },
  )

  const output = result.stdout + result.stderr

  expect(output).not.toContain("Using local @tscircuit/cli")
  expect(output).not.toContain("LOCAL_CLI_EXECUTED")

  rmSync(tmpDir, { recursive: true, force: true })
})
