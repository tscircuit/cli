import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile, stat } from "node:fs/promises"
import path from "node:path"
import { ensureBrowserModules } from "../../fixtures/ensure-browser-modules"
import {
  BUNDLED_BROWSER_MODULE_NAMES,
  type BundledBrowserModuleManifest,
} from "lib/shared/bundled-browser-modules"

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
  expect(indexHtml).not.toContain("TSCIRCUIT_JSCDN_BASE_URL")
  expect(standaloneJs.isFile()).toBe(true)
  await expect(stat(path.join(tmpDir, "dist", "jscdn"))).rejects.toBeTruthy()
}, 30_000)

test("build --site --bundle-jscdn includes every RunFrame module and sets the local URL", async () => {
  await ensureBrowserModules()
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test.circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { stderr, exitCode } = await runCommand(
    `tsci build --site --bundle-jscdn ${circuitPath}`,
  )
  expect(stderr).toBe("")
  expect(exitCode).toBe(0)
  const html = await readFile(path.join(tmpDir, "dist", "index.html"), "utf-8")
  expect(html).toContain('window.TSCIRCUIT_JSCDN_BASE_URL = "./jscdn";')
  const directory = path.join(tmpDir, "dist", "jscdn")
  const manifest = JSON.parse(
    await readFile(path.join(directory, "manifest.json"), "utf-8"),
  ) as BundledBrowserModuleManifest
  expect(Object.keys(manifest).sort()).toEqual(
    [...BUNDLED_BROWSER_MODULE_NAMES].sort(),
  )
  for (const name of BUNDLED_BROWSER_MODULE_NAMES) {
    expect(
      (await stat(path.join(directory, name, "latest", "+esm"))).size,
    ).toBeGreaterThan(0)
    expect(
      (await stat(path.join(directory, name, manifest[name].version, "+esm")))
        .size,
    ).toBeGreaterThan(0)
  }
}, 60_000)

test("--bundle-jscdn requires --site and cannot be combined with an explicit base URL", async () => {
  const { runCommand } = await getCliTestFixture()
  const missingSite = await runCommand("tsci build --bundle-jscdn")
  expect(missingSite.exitCode).toBe(1)
  expect(missingSite.stderr).toContain("--bundle-jscdn requires --site")
  const conflict = await runCommand(
    "tsci build --site --bundle-jscdn --jscdn-base-url=./other",
  )
  expect(conflict.exitCode).toBe(1)
  expect(conflict.stderr).toContain("cannot be used with")
})

test("build --site --jscdn-base-url injects the URL before RunFrame loads", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "test.circuit.tsx")
  await writeFile(circuitPath, circuitCode)
  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const { stderr, exitCode } = await runCommand(
    `tsci build --site --jscdn-base-url=./jscdn ${circuitPath}`,
  )
  expect(stderr).toBe("")
  expect(exitCode).toBe(0)

  const html = await readFile(path.join(tmpDir, "dist", "index.html"), "utf-8")
  expect(html).toContain('window.TSCIRCUIT_JSCDN_BASE_URL = "./jscdn";')
  expect(html.indexOf("window.TSCIRCUIT_JSCDN_BASE_URL")).toBeLessThan(
    html.indexOf('<script type="module" src="./standalone.min.js">'),
  )
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
    `tsci build --site --use-cdn-javascript --jscdn-base-url https://standalone.example/jscdn ${circuitPath}`,
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
  expect(indexHtml).toContain(
    'window.TSCIRCUIT_JSCDN_BASE_URL = "https://standalone.example/jscdn";',
  )

  // standalone.min.js should NOT be created when using CDN
  await expect(
    stat(path.join(tmpDir, "dist", "standalone.min.js")),
  ).rejects.toBeTruthy()
}, 30_000)
