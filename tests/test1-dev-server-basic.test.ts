import { afterEach, expect, test } from "bun:test"
import { DevServer } from "cli/dev/DevServer"
import getPort from "get-port"
import { join } from "node:path"
import { getCliTestFixture } from "./fixtures/get-cli-test-fixture"

test("test1 basic dev server filesystem watching", async () => {
  const fixture = await getCliTestFixture()
  
  // Create test files using Bun.write instead of vfs
  await Bun.write(
    join(fixture.tmpDir, "snippet.tsx"),
    `
    export const MyCircuit = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
    `
  )
  
  await Bun.write(
    join(fixture.tmpDir, "manual-edits.json"),
    "{}"
  )
  
  // Get a unique port for the DevServer to avoid conflicts
  const devServerPort = await getPort()
  
  // Create and start the DevServer
  const devServer = new DevServer({
    port: devServerPort,
    componentFilePath: join(fixture.tmpDir, "snippet.tsx"),
  })

  await devServer.start()
  await devServer.addEntrypoint()

  // Test the file list
  const { file_list } = await devServer.fsKy.get("api/files/list").json()

  expect(file_list.map((f) => f.file_path).sort()).toContainValues([
    "entrypoint.tsx",
    "manual-edits.json",
    "snippet.tsx",
  ])

  afterEach(async () => {
    await devServer.stop()
  })
})
