import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { expect, test } from "bun:test"
import { writeFile, readFile } from "node:fs/promises"
import path from "node:path"
import { runInNewContext } from "node:vm"

test("build --site ignores configured iframe tabs with --ignore-config", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const extraRunFrameTabs = [
    {
      tabName: "Sysconfig",
      iframeUrl: "https://sysconfig-viewer.tscircuit.com/#compressed-content",
      mainComponentPath: "test.circuit.json",
    },
  ]
  await writeFile(path.join(tmpDir, "test.circuit.json"), "[]")
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({
      extraRunFrameTabs,
    }),
  )

  const { stderr, exitCode } = await runCommand(
    `tsci build test.circuit.json --site --ignore-config`,
  )
  expect(stderr).toBe("")
  expect(exitCode).toBe(0)
  const html = await readFile(path.join(tmpDir, "dist/index.html"), "utf8")
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1]
  const window: Record<string, unknown> = {}
  runInNewContext(script!, { window })
  expect(window.TSCIRCUIT_EXTRA_RUNFRAME_TABS).toEqual([])
}, 30_000)
