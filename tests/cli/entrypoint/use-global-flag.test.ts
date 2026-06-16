import { expect, test } from "bun:test"
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { temporaryDirectory } from "tempy"

const nodeBin = process.env.npm_node_execpath ?? "node"

const writeFakeLocalCli = (projectDir: string) => {
  const localCliPath = join(projectDir, "node_modules", "@tscircuit", "cli")
  const localTsxPath = join(localCliPath, "node_modules", "tsx")

  mkdirSync(join(localCliPath, "dist", "cli"), { recursive: true })
  mkdirSync(join(localTsxPath, "dist"), { recursive: true })

  writeFileSync(
    join(localCliPath, "package.json"),
    JSON.stringify({ name: "@tscircuit/cli", version: "0.0.999-local" }),
  )

  writeFileSync(
    join(localCliPath, "dist", "cli", "main.js"),
    'console.log("LOCAL_CLI_EXECUTED")',
  )

  writeFileSync(
    join(localTsxPath, "package.json"),
    JSON.stringify({
      name: "tsx",
      version: "0.0.0-test",
      type: "module",
      exports: {
        ".": "./dist/loader.mjs",
      },
    }),
  )

  writeFileSync(join(localTsxPath, "dist", "loader.mjs"), "")
}

test("entrypoint uses local version by default when available", async () => {
  const tmpDir = temporaryDirectory()

  writeFakeLocalCli(tmpDir)

  writeFileSync(
    join(tmpDir, "package.json"),
    JSON.stringify({ name: "test-project", version: "1.0.0" }),
  )

  const entrypointPath = resolve(process.cwd(), "cli/entrypoint.js")

  const result = spawnSync(nodeBin, [entrypointPath, "--version"], {
    cwd: tmpDir,
    encoding: "utf-8",
  })

  const output = result.stdout + result.stderr

  expect(output).toContain("Using local @tscircuit/cli v0.0.999-local")
  expect(output).toContain("LOCAL_CLI_EXECUTED")

  rmSync(tmpDir, { recursive: true, force: true })
})

test("entrypoint skips local version when --use-global flag is passed", async () => {
  const tmpDir = temporaryDirectory()

  writeFakeLocalCli(tmpDir)

  writeFileSync(
    join(tmpDir, "package.json"),
    JSON.stringify({ name: "test-project", version: "1.0.0" }),
  )

  const entrypointPath = resolve(process.cwd(), "cli/entrypoint.js")

  const result = spawnSync(
    nodeBin,
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

test("entrypoint does not require bun at runtime", () => {
  const entrypointPath = resolve(process.cwd(), "cli/entrypoint.js")
  const entrypointSource = readFileSync(entrypointPath, "utf-8")

  expect(entrypointSource).toContain("#!/usr/bin/env node")
  expect(entrypointSource).not.toContain('"bun"')
  expect(entrypointSource).toContain('"--import"')
  expect(entrypointSource).toContain('resolve("tsx")')
})
