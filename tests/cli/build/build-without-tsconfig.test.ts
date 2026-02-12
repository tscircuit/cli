import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { readFile, stat } from "node:fs/promises"
import path from "node:path"

test("build without tsconfig.json auto-generates it and has no type errors", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await runCommand(`tsci init -y`)
  const { stdout, stderr } = await runCommand(`tsci build --ci`)

  expect(stderr).not.toContain("TS2339")
  expect(stderr).not.toContain("does not exist on type 'JSX.IntrinsicElements'")
  expect(stderr).not.toContain("TS2688")
  expect(stderr).not.toContain(
    "Cannot find type definition file for 'tscircuit'",
  )

  // Verify transpilation outputs were created
  const esmPath = path.join(tmpDir, "dist", "index.js")
  const esmContent = await readFile(esmPath, "utf-8")
  expect(esmContent).toContain("react/jsx-runtime")
  expect(esmContent).toContain("board")

  const cjsPath = path.join(tmpDir, "dist", "index.cjs")
  const cjsStat = await stat(cjsPath)
  expect(cjsStat.isFile()).toBe(true)

  const dtsPath = path.join(tmpDir, "dist", "index.d.ts")
  const dtsStat = await stat(dtsPath)
  expect(dtsStat.isFile()).toBe(true)
}, 30_000)
