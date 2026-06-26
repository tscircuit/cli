import { expect, test } from "bun:test"
import { DevServer } from "cli/dev/DevServer"
import getPort from "get-port"
import { join } from "node:path"
import { mkdir, writeFile } from "node:fs/promises"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const LOCAL_BUNDLE = "LOCAL_TSCIRCUIT_BUNDLE_SENTINEL"

/**
 * `tsci dev` should render with the `tscircuit` version installed in the project,
 * so the dev server must serve that package's `dist/browser.min.js` (the
 * standalone runframe + eval bundle) instead of the runframe bundled into the CLI.
 */
test("dev server serves the project-local tscircuit standalone bundle", async () => {
  const fixture = await getCliTestFixture()
  const projectDir = fixture.tmpDir

  await writeFile(
    join(projectDir, "index.tsx"),
    'export default () => <board width="10mm" height="10mm" />\n',
  )
  await writeFile(
    join(projectDir, "package.json"),
    JSON.stringify({ name: "test-project", version: "1.0.0" }),
  )

  // Install a project-local tscircuit whose browser bundle is recognizable
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
  await writeFile(join(tscircuitDir, "dist", "browser.min.js"), LOCAL_BUNDLE)

  const devServerPort = await getPort()
  const devServer = new DevServer({
    port: devServerPort,
    componentFilePath: join(projectDir, "index.tsx"),
    projectDir,
  })

  try {
    await devServer.start()

    const standalone = await fetch(
      `http://localhost:${devServerPort}/standalone.min.js`,
    ).then((res) => res.text())

    expect(standalone).toBe(LOCAL_BUNDLE)
  } finally {
    await devServer.stop()
  }
}, 30_000)
