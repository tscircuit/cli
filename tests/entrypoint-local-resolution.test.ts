import { expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import * as os from "node:os"
import * as path from "node:path"

const GLOBAL_VERSION = JSON.parse(
  readFileSync(path.join(process.cwd(), "package.json"), "utf-8"),
).version

test("entrypoint prefers local cli installation when available", () => {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), "tsci-entrypoint-"))
  const localCliDir = path.join(tmpDir, "node_modules", "@tscircuit", "cli")

  try {
    mkdirSync(path.join(localCliDir, "dist"), { recursive: true })

    writeFileSync(
      path.join(localCliDir, "package.json"),
      JSON.stringify({ name: "@tscircuit/cli", version: "9.9.9" }),
    )

    writeFileSync(
      path.join(localCliDir, "dist", "main.js"),
      'console.log("LOCAL CLI EXECUTED")\n',
    )

    const entrypointPath = path.join(process.cwd(), "cli", "entrypoint.js")
    const result = spawnSync("node", [entrypointPath], {
      cwd: tmpDir,
      encoding: "utf-8",
    })

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("LOCAL CLI EXECUTED")
    expect(result.stderr).toContain(
      `Using local @tscircuit/cli v9.9.9 instead of global v${GLOBAL_VERSION}`,
    )
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
})
