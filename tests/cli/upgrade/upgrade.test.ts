import { expect, test } from "bun:test"
import { fileURLToPath } from "node:url"

const runScenario = async (scenario: string) => {
  const proc = Bun.spawn(
    [
      process.execPath,
      fileURLToPath(
        new URL("../../fixtures/run-upgrade-scenario.ts", import.meta.url),
      ),
      scenario,
    ],
    {
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, FORCE_COLOR: "0", TSCI_SKIP_CLI_UPDATE: "false" },
    },
  )
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  return { stdout, stderr, exitCode }
}

test("upgrade exits unsuccessfully when package installation fails", async () => {
  const result = await runScenario("failure")
  expect(result.stderr).toContain("Update failed")
  expect(result.stdout).toContain("install-attempts=1")
  expect(result.stdout).not.toContain("already using the latest")
  expect(result.stdout).not.toContain("updated successfully")
  expect(result.exitCode).toBe(1)
})

test("upgrade succeeds after successful package installation", async () => {
  const result = await runScenario("success")
  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain("updated successfully")
  expect(result.stdout).toContain("install-attempts=1")
  expect(result.stdout).not.toContain("already using the latest")
})

test("upgrade skips installation when the current version is latest", async () => {
  const result = await runScenario("current")
  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain("already using the latest")
  expect(result.stdout).toContain("install-attempts=0")
})

test("an optional update failure returns false and lets the command continue", async () => {
  const result = await runScenario("optional")
  expect(result.exitCode).toBe(0)
  expect(result.stderr).toContain("Update failed")
  expect(result.stdout).toContain("optional-update-result=false")
  expect(result.stdout).toContain("original-command-continues")
  expect(result.stdout).toContain("install-attempts=1")
})
