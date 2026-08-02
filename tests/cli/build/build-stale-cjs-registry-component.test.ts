import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { mkdir, symlink, writeFile, stat } from "node:fs/promises"
import path from "node:path"

const stalePartCjs = `"use strict";
var core = require("@tscircuit/core");
if (!core || typeof core !== "object" || Object.keys(core).length === 0) {
  throw new Error("@tscircuit/core resolved but has no exports");
}
exports.StaleChip = function StaleChip(props) {
  return globalThis.React.createElement("chip", {
    name: props.name || "U1",
    footprint: "soic8",
  });
};
`

const circuitCode = `import { StaleChip } from "@tsci/testuser.stale-part"

export default () => (
  <board width="20mm" height="20mm">
    <StaleChip name="U1" />
  </board>
)
`

test("build succeeds for registry components whose CJS build requires ESM-only @tscircuit/core", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  // Give the project the same ESM-only @tscircuit/core build the CLI ships
  // with (exports map only declares an `import` condition)
  const realCoreDir = path.resolve(
    import.meta.dir,
    "../../../node_modules/@tscircuit/core",
  )
  const tscircuitScopeDir = path.join(tmpDir, "node_modules", "@tscircuit")
  await mkdir(tscircuitScopeDir, { recursive: true })
  await symlink(realCoreDir, path.join(tscircuitScopeDir, "core"), "dir")
  await symlink(
    path.resolve(import.meta.dir, "../../../node_modules/react"),
    path.join(tmpDir, "node_modules", "react"),
    "dir",
  )

  // A registry component published before core went ESM-only: its CJS build
  // requires @tscircuit/core at load time (#3982)
  const stalePartDir = path.join(
    tmpDir,
    "node_modules",
    "@tsci",
    "testuser.stale-part",
  )
  await mkdir(stalePartDir, { recursive: true })
  await writeFile(
    path.join(stalePartDir, "package.json"),
    JSON.stringify({
      name: "@tsci/testuser.stale-part",
      version: "1.0.0",
      main: "index.cjs",
    }),
  )
  await writeFile(path.join(stalePartDir, "index.cjs"), stalePartCjs)

  const circuitPath = path.join(tmpDir, "circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { stdout, exitCode } = await runCommand(`tsci build ${circuitPath}`)

  expect(stdout).not.toContain("Cannot find module '@tscircuit/core'")
  expect(exitCode).toBe(0)

  const circuitJsonStat = await stat(
    path.join(tmpDir, "dist", "circuit", "circuit.json"),
  )
  expect(circuitJsonStat.isFile()).toBe(true)
}, 120_000)
