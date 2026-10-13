import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readFile, stat } from "node:fs/promises"
import path from "node:path"
import {
  preparedJscdnFiles,
  writePreparedJscdn,
} from "tests/fixtures/prepared-jscdn"

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
}, 30_000)

for (const customBase of [undefined, "/assets/jscdn"]) {
  test(`--bundle-jscdn copies prepared packages with base ${customBase ?? "./jscdn"}`, async () => {
    const { tmpDir } = await getCliTestFixture()
    const source = path.join(tmpDir, "prepared-jscdn")
    await writePreparedJscdn(source)
    await writeFile(path.join(tmpDir, "test.circuit.json"), "[]")
    await writeFile(path.join(tmpDir, "package.json"), "{}")
    const preload = path.join(tmpDir, "no-fetch.ts")
    await writeFile(
      preload,
      'globalThis.fetch = () => { throw new Error("Site bundling must not fetch packages") }\n',
    )
    const args = [
      "bun",
      "--preload",
      preload,
      path.resolve("cli/main.ts"),
      "build",
      "test.circuit.json",
      "--site",
      "--bundle-jscdn",
    ]
    if (customBase) args.push("--jscdn-base-url", customBase)
    const subprocess = Bun.spawn(args, {
      cwd: tmpDir,
      env: {
        ...process.env,
        TSCI_TEST_MODE: "true",
        TSCIRCUIT_CONFIG_DIR: path.join(tmpDir, ".config"),
        TSCIRCUIT_JSCDN_DIR: source,
      },
      stdout: "pipe",
      stderr: "pipe",
    })
    const [, stderr, exitCode] = await Promise.all([
      new Response(subprocess.stdout).text(),
      new Response(subprocess.stderr).text(),
      subprocess.exited,
    ])
    expect(stderr).toBe("")
    expect(exitCode).toBe(0)
    for (const [file, content] of Object.entries(preparedJscdnFiles)) {
      expect(
        new Uint8Array(await readFile(path.join(tmpDir, "dist/jscdn", file))),
      ).toEqual(
        typeof content === "string"
          ? new TextEncoder().encode(content)
          : content,
      )
    }
    const html = await readFile(path.join(tmpDir, "dist/index.html"), "utf8")
    expect(html).toContain(
      `window.TSCIRCUIT_JSCDN_BASE_URL = ${JSON.stringify(customBase ?? "./jscdn")};`,
    )
    expect(html).not.toContain('type="importmap"')
    expect(await readFile(path.join(tmpDir, "package.json"), "utf8")).toBe("{}")
  }, 30_000)
}

test("--bundle-jscdn fails before building when prepared packages are not configured", async () => {
  const { runCommand, tmpDir } = await getCliTestFixture()
  const previous = process.env.TSCIRCUIT_JSCDN_DIR
  delete process.env.TSCIRCUIT_JSCDN_DIR
  try {
    const { stderr, exitCode } = await runCommand(
      "tsci build --site --bundle-jscdn",
    )
    expect(exitCode).toBe(1)
    expect(stderr).toContain("requires TSCIRCUIT_JSCDN_DIR")
    await expect(stat(path.join(tmpDir, "dist"))).rejects.toBeTruthy()
  } finally {
    if (previous !== undefined) process.env.TSCIRCUIT_JSCDN_DIR = previous
  }
})

test("--bundle-jscdn requires --site", async () => {
  const { runCommand } = await getCliTestFixture()
  const { stderr, exitCode } = await runCommand("tsci build --bundle-jscdn")
  expect(exitCode).toBe(1)
  expect(stderr).toContain("requires --site")
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
