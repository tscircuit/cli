import { expect, test } from "bun:test"
import { DevServer } from "cli/dev/DevServer"
import getPort from "get-port"
import { join } from "node:path"
import { mkdir, writeFile } from "node:fs/promises"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const LOCAL_BUNDLE = "LOCAL_TSCIRCUIT_BUNDLE_SENTINEL"
const GLOBAL_BUNDLE = "GLOBAL_TSCIRCUIT_BUNDLE_SENTINEL"

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
    expect(await fetchStandalone(tmpDir)).toBe(LOCAL_BUNDLE)
  } finally {
    delete process.env.TSCIRCUIT_GLOBAL_STANDALONE_FILE_PATH
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
    expect(await fetchStandalone(tmpDir)).toBe(GLOBAL_BUNDLE)
  } finally {
    delete process.env.TSCIRCUIT_GLOBAL_STANDALONE_FILE_PATH
  }
}, 30_000)
