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
    },
  })

  const devServer = new DevServer({
    port: devServerPort,
    entrypoint: `${tempDirPath}/snippet.tsx`,
  })

  await devServer.start()

  afterEach(async () => {
    await devServer.stop()
  })
})
