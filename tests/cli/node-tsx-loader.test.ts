import { expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { getCliTestFixture } from "../fixtures/get-cli-test-fixture"

const repoRoot = process.cwd()
const nodeExecPath = (() => {
  const candidates = [
    process.env.NODE_BINARY,
    "/usr/local/bin/node",
    "/usr/bin/node",
  ].filter((candidate): candidate is string => Boolean(candidate))

  for (const dir of (process.env.PATH || "").split(path.delimiter)) {
    if (!dir) continue
    candidates.push(path.join(dir, "node"))
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }
  return "node"
})()

const ensureDistBuilt = () => {
  const distMainPath = path.join(repoRoot, "dist/cli/main.js")
  const distBundlePath = path.join(repoRoot, "dist/cli/main-bundle.js")
  if (!fs.existsSync(distMainPath) || !fs.existsSync(distBundlePath)) {
    const buildResult = spawnSync(
      process.execPath,
      ["run", "scripts/bun-build.ts"],
      {
        cwd: repoRoot,
        stdio: "inherit",
      },
    )
    expect(buildResult.status).toBe(0)
  }
}

test("Node entrypoint and dist/cli/main.js load .tsx circuits without Bun on PATH", async () => {
  ensureDistBuilt()

  const { tmpDir } = await getCliTestFixture()
  const subComponentPath = path.join(tmpDir, "led-part.tsx")
  const valuesJsonPath = path.join(tmpDir, "values.json")
  const boardPath = path.join(tmpDir, "index.circuit.tsx")

  fs.writeFileSync(
    valuesJsonPath,
    JSON.stringify({ resistance: "1k" }, null, 2),
  )
  fs.writeFileSync(
    subComponentPath,
    `export const LedPart = () => <led name="LED1" footprint="0402" />\n`,
  )
  fs.writeFileSync(
    boardPath,
    [
      'import { LedPart } from "./led-part"',
      'import values from "./values.json"',
      "export default () => (",
      '  <board width="10mm" height="10mm">',
      '    <resistor name="R1" resistance={values.resistance} footprint="0402" />',
      "    <LedPart />",
      '    <trace from=".R1 > .pin1" to=".LED1 > .pin1" />',
      "  </board>",
      ")",
      "",
    ].join("\n"),
  )

  const envWithoutBun = {
    ...process.env,
    PATH: "/usr/bin:/bin",
  }

  const versionRes = spawnSync(
    nodeExecPath,
    [path.join(repoRoot, "cli/entrypoint.js"), "--version"],
    {
      cwd: tmpDir,
      env: envWithoutBun,
      encoding: "utf-8",
    },
  )

  expect(versionRes.status).toBe(0)
  expect(versionRes.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/)

  const netlistRes = spawnSync(
    nodeExecPath,
    [path.join(repoRoot, "cli/entrypoint.js"), "check", "netlist", boardPath],
    {
      cwd: tmpDir,
      env: envWithoutBun,
      encoding: "utf-8",
    },
  )

  expect(netlistRes.status).toBe(0)
  expect(netlistRes.stdout).toContain("Readable Netlist:")
  expect(netlistRes.stdout).toContain("R1")
  expect(netlistRes.stdout).toContain("LED1")
}, 60_000)
