import { test, expect, afterEach } from "bun:test"
import { DevServer } from "cli/dev/DevServer"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("test1 basic dev server filesystem watching", async () => {
  const { tempDirPath, devServerPort, devServerUrl } = await getTestFixture({
    vfs: {
      "snippet.tsx": `
      export const MyCircuit = () => (
        <board width="10mm" height="10mm">
          <chip name="U1" footprint="soic8" />
        </board>
      )
      `,
      "manual-edits.json": "{}",
    },
  })

  const devServer = new DevServer({
    port: devServerPort,
    componentFilePath: `${tempDirPath}/snippet.tsx`,
  })

  await devServer.start()
  await devServer.addEntrypoint()

  const { file_list } = await devServer.fsKy.get("api/files/list").json()

  expect(file_list.map((f) => f.file_path).sort()).toMatchInlineSnapshot(`
[
  "entrypoint.tsx",
  "manual-edits.json",
  "snippet.tsx",
]
`)

  afterEach(async () => {
    await devServer.stop()
  })
})
