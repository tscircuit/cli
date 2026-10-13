import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { beforeAll, test, expect } from "bun:test"
import { writeFile, readFile, stat } from "node:fs/promises"
import path from "node:path"
import { BUNDLED_BROWSER_MODULE_NAMES } from "lib/shared/bundled-browser-modules"
import { ensureBrowserModules } from "../../fixtures/ensure-browser-modules"

beforeAll(ensureBrowserModules, 30_000)

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
  expect(indexHtml).toContain('"jscdnBaseUrl":"./jscdn"')
  expect(indexHtml).not.toContain("cdn.tailwindcss.com")
  expect(indexHtml).not.toContain("github.com/tscircuit.png")
  const manifest = JSON.parse(
    await readFile(path.join(tmpDir, "dist/jscdn/manifest.json"), "utf8"),
  )
  for (const name of BUNDLED_BROWSER_MODULE_NAMES) {
    expect(
      (
        await stat(path.join(tmpDir, "dist/jscdn", name, "latest/+esm"))
      ).isFile(),
    ).toBe(true)
    expect(
      (
        await stat(
          path.join(tmpDir, "dist/jscdn", name, manifest[name].version, "+esm"),
        )
      ).isFile(),
    ).toBe(true)
  }
}, 30_000)

test("build --site copies browser config with hooks and preserves explicit project jscdnBaseUrl", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test.circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  await writeFile(
    path.join(tmpDir, "tscircuit.config.ts"),
    `export default {
    browserPlatformConfigPath: "./browser-platform.ts",
    platformConfig: { jscdnBaseUrl: "./enterprise-jscdn", platformFetch: fetch },
  }`,
  )
  await writeFile(
    path.join(tmpDir, "browser-platform.ts"),
    `export default {
    platformFetch: (url: RequestInfo | URL, init?: RequestInit) => fetch(url, init),
  }`,
  )
  const { stderr, exitCode } = await runCommand(
    `tsci build --site ${circuitPath}`,
  )
  expect(stderr).toBe("")
  expect(exitCode).toBe(0)
  const html = await readFile(path.join(tmpDir, "dist/index.html"), "utf8")
  expect(html).toContain('"jscdnBaseUrl":"./enterprise-jscdn"')
  expect(html).toContain('import platformConfig from "./platform-config.js"')
  expect(html).toContain('await import("./standalone.min.js")')
  expect(
    await readFile(path.join(tmpDir, "dist/platform-config.js"), "utf8"),
  ).toContain("platformFetch")
}, 30_000)

test("build with --site generates only 3D preview images for every circuit", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await writeFile(path.join(tmpDir, "first.circuit.tsx"), circuitCode)
  await writeFile(path.join(tmpDir, "second.circuit.tsx"), circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { stderr } = await runCommand("tsci build --site --use-cdn-javascript")
  expect(stderr).toBe("")

  for (const circuitName of ["first", "second"]) {
    const outputDir = path.join(tmpDir, "dist", circuitName)
    const preview3d = await readFile(path.join(outputDir, "3d.png"))

    expect(preview3d[0]).toBe(0x89)
    expect(preview3d[1]).toBe(0x50)
    expect(preview3d[2]).toBe(0x4e)
    expect(preview3d[3]).toBe(0x47)
    await expect(stat(path.join(outputDir, "pcb.svg"))).rejects.toBeTruthy()
    await expect(
      stat(path.join(outputDir, "schematic.svg")),
    ).rejects.toBeTruthy()
  }
}, 60_000)

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
