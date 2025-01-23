import { test, expect, afterEach } from "bun:test"
import { DevServer } from "cli/dev/DevServer"
import { getTestFixture } from "tests/fixtures/get-test-fixture"
import * as http from "node:http"

test("test3 dev server port handling", async () => {
  const { tempDirPath } = await getTestFixture({
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

  const server = http.createServer(() => {}).listen(3020)
  
  const devServer = new DevServer({
    port: 3021,
    componentFilePath: `${tempDirPath}/snippet.tsx`,
  })
  await devServer.start()

  await new Promise(resolve => setTimeout(resolve, 1000))

  const res = await fetch(`http://localhost:3021`)
  expect(res.status).toBe(200)

  afterEach(async () => {
    server.close()
    await devServer.stop()
  })
})
