import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile } from "node:fs/promises"
import path from "node:path"

const packageJson = JSON.stringify({
  name: "test-project",
  dependencies: {
    react: "*",
    tscircuit: "*",
  },
})

const circuitCode = (name: string) => `
await new Promise((resolve) => setTimeout(resolve, 150))

export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="${name}" schX={3} pcbX={3} />
  </board>
)
`

test("build with --concurrency prints async effects status in worker stdio heartbeat", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  const previousAsyncEffectsHeartbeatInterval =
    process.env.TSCIRCUIT_BUILD_ASYNC_EFFECTS_HEARTBEAT_INTERVAL_MS
  process.env.TSCIRCUIT_BUILD_ASYNC_EFFECTS_HEARTBEAT_INTERVAL_MS = "20"

  try {
    await writeFile(path.join(tmpDir, "first.circuit.tsx"), circuitCode("R1"))
    await writeFile(path.join(tmpDir, "second.circuit.tsx"), circuitCode("R2"))
    await writeFile(path.join(tmpDir, "package.json"), packageJson)

    await runCommand("tsci install")

    const { stdout, exitCode } = await runCommand("tsci build --concurrency 2")

    expect(exitCode).toBe(0)
    expect(stdout).toContain("[worker-async-effects]")
    expect(stdout).toContain("running_async_effects=")
  } finally {
    if (previousAsyncEffectsHeartbeatInterval === undefined) {
      process.env.TSCIRCUIT_BUILD_ASYNC_EFFECTS_HEARTBEAT_INTERVAL_MS =
        undefined
    } else {
      process.env.TSCIRCUIT_BUILD_ASYNC_EFFECTS_HEARTBEAT_INTERVAL_MS =
        previousAsyncEffectsHeartbeatInterval
    }
  }
}, 120_000)
