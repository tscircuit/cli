import { expect, test } from "bun:test"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { DevServer } from "cli/dev/DevServer"
import getPort from "get-port"
import { createLocalCacheEngine } from "lib/shared/get-platform-config-with-cli-defaults"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const LOCAL_BUNDLE =
  'const config={evalWebWorkerBlobUrl:"embedded",enableFetchProxy:true};/* LOCAL_TSCIRCUIT_BUNDLE_SENTINEL */'
const GLOBAL_BUNDLE =
  'const config={evalWebWorkerBlobUrl:"embedded",enableFetchProxy:true};/* GLOBAL_TSCIRCUIT_BUNDLE_SENTINEL */'
const LOCAL_WORKER = "/* LOCAL_TSCIRCUIT_WORKER_SENTINEL */"

const writeProject = async (projectDir: string) => {
  await writeFile(
    join(projectDir, "index.tsx"),
    'export default () => <board width="10mm" height="10mm" />\n',
  )
  await writeFile(
    join(projectDir, "package.json"),
    JSON.stringify({ name: "test-project", version: "1.0.0" }),
  )
}

const installLocalTscircuit = async (projectDir: string, bundle: string) => {
  const tscircuitDir = join(projectDir, "node_modules", "tscircuit")
  await mkdir(join(tscircuitDir, "dist"), { recursive: true })
  await writeFile(
    join(tscircuitDir, "package.json"),
    JSON.stringify({
      name: "tscircuit",
      version: "0.0.999-local",
      exports: { "./browser": "./dist/browser.min.js" },
    }),
  )
  await writeFile(join(tscircuitDir, "dist", "browser.min.js"), bundle)
  await writeFile(join(tscircuitDir, "dist", "webworker.min.js"), LOCAL_WORKER)
}

const fetchStandalone = async (projectDir: string) => {
  const port = await getPort()
  const devServer = new DevServer({
    port,
    componentFilePath: join(projectDir, "index.tsx"),
    projectDir,
  })
  try {
    await devServer.start()
    return await fetch(`http://localhost:${port}/standalone.min.js`).then(
      (res) => res.text(),
    )
  } finally {
    await devServer.stop()
  }
}

/**
 * `tsci dev` renders with the `tscircuit` installed in the project, so the dev
 * server serves that package's `dist/browser.min.js`. It is preferred over the
 * global tscircuit bundle (the `tsci` binary's), since a project pin is the
 * stronger signal.
 */
test("dev server serves the project-local tscircuit bundle, even when a global bundle is set", async () => {
  const { tmpDir } = await getCliTestFixture()
  await writeProject(tmpDir)
  await installLocalTscircuit(tmpDir, LOCAL_BUNDLE)

  const globalBundlePath = join(tmpDir, "global-browser.min.js")
  await writeFile(globalBundlePath, GLOBAL_BUNDLE)
  process.env.TSCIRCUIT_GLOBAL_STANDALONE_FILE_PATH = globalBundlePath

  try {
    const standalone = await fetchStandalone(tmpDir)
    expect(standalone).toContain("LOCAL_TSCIRCUIT_BUNDLE_SENTINEL")
    expect(standalone).toContain(
      'evalWebWorkerBlobUrl:"/__tscircuit/eval-webworker.js"',
    )
  } finally {
    process.env.TSCIRCUIT_GLOBAL_STANDALONE_FILE_PATH = undefined
  }
}, 30_000)

/**
 * When the project has no local tscircuit, the dev server serves the bundle from
 * the tscircuit that provides the `tsci` binary, exposed via
 * TSCIRCUIT_GLOBAL_STANDALONE_FILE_PATH (set by tscircuit's cli.mjs).
 */
test("dev server falls back to TSCIRCUIT_GLOBAL_STANDALONE_FILE_PATH when no local tscircuit", async () => {
  const { tmpDir } = await getCliTestFixture()
  await writeProject(tmpDir)

  const globalBundlePath = join(tmpDir, "global-browser.min.js")
  await writeFile(globalBundlePath, GLOBAL_BUNDLE)
  process.env.TSCIRCUIT_GLOBAL_STANDALONE_FILE_PATH = globalBundlePath

  try {
    const standalone = await fetchStandalone(tmpDir)
    expect(standalone).toContain("GLOBAL_TSCIRCUIT_BUNDLE_SENTINEL")
    expect(standalone).toContain(
      'evalWebWorkerBlobUrl:"/__tscircuit/eval-webworker.js"',
    )
  } finally {
    process.env.TSCIRCUIT_GLOBAL_STANDALONE_FILE_PATH = undefined
  }
}, 30_000)

test("RunFrame's worker reads and writes the CLI project cache", async () => {
  const { tmpDir } = await getCliTestFixture()
  await writeProject(tmpDir)
  await installLocalTscircuit(tmpDir, LOCAL_BUNDLE)

  const port = await getPort()
  const devServer = new DevServer({
    port,
    componentFilePath: join(tmpDir, "index.tsx"),
    projectDir: tmpDir,
  })

  try {
    await devServer.start()
    const origin = `http://localhost:${port}`
    const worker = await fetch(`${origin}/__tscircuit/eval-webworker.js`).then(
      (res) => res.text(),
    )
    expect(worker).toContain(
      'Symbol.for("tscircuit.inheritedLocalCacheEngine")',
    )
    expect(worker).toContain("LOCAL_TSCIRCUIT_WORKER_SENTINEL")

    const cache = createLocalCacheEngine(join(tmpDir, ".tscircuit", "cache"))
    cache.setItem("written-by-cli", '{"source":"cli"}')

    const cliValue = await fetch(
      `${origin}/__tscircuit/cache?key=written-by-cli`,
    ).then((res) => res.text())
    expect(cliValue).toBe('{"source":"cli"}')

    await fetch(`${origin}/__tscircuit/cache?key=written-by-runframe`, {
      method: "POST",
      body: '{"source":"runframe"}',
    })
    expect(cache.getItem("written-by-runframe")).toBe('{"source":"runframe"}')
  } finally {
    await devServer.stop()
  }
}, 30_000)
