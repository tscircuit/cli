import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile, stat } from "node:fs/promises"
import path from "node:path"

const circuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
  </board>
)`

test("build with --site generates index.html and standalone.min.js", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test.circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { stderr } = await runCommand(`tsci build --site ${circuitPath}`)
  expect(stderr).toBe("")

  const indexHtml = await readFile(
    path.join(tmpDir, "dist", "index.html"),
    "utf-8",
  )
  const standaloneJs = await stat(
    path.join(tmpDir, "dist", "standalone.min.js"),
  )

  expect(indexHtml).toContain(
    '<script type="module" src="./standalone.min.js"></script>',
  )
  expect(indexHtml).toContain("window.TSCIRCUIT_USE_RUNFRAME_FOR_CLI = false;")
  expect(indexHtml).toContain("window.TSCIRCUIT_RUNFRAME_STATIC_FILE_LIST")
  expect(standaloneJs.isFile()).toBe(true)
}, 30_000)

test("build with --site --use-cdn-javascript uses CDN URL and no standalone.min.js", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test.circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { stderr } = await runCommand(
    `tsci build --site --use-cdn-javascript ${circuitPath}`,
  )
  expect(stderr).toBe("")

  const indexHtml = await readFile(
    path.join(tmpDir, "dist", "index.html"),
    "utf-8",
  )

  // Should use CDN URL instead of local standalone.min.js
  expect(indexHtml).toContain("cdn.jsdelivr.net/npm/tscircuit@")
  expect(indexHtml).toContain("/dist/browser.min.js")
  expect(indexHtml).not.toContain('src="./standalone.min.js"')

  // standalone.min.js should NOT be created when using CDN
  await expect(
    stat(path.join(tmpDir, "dist", "standalone.min.js")),
  ).rejects.toBeTruthy()
}, 30_000)
