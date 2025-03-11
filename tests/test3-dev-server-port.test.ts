import { afterEach, expect, test } from "bun:test"
import { DevServer } from "cli/dev/DevServer"
import getPort from "get-port"
import * as http from "node:http"
import { join } from "node:path"
import { getCliTestFixture } from "./fixtures/get-cli-test-fixture"

test("test3 dev server port handling", async () => {
  const { tmpDir } = await getCliTestFixture()

  // Create test circuit file
  await Bun.write(
    join(tmpDir, "snippet.tsx"),
    `
    export const MyCircuit = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
    `,
  )

  // Get unique ports for both servers
  const httpPort = await getPort()
  const devServerPort = await getPort()

  // Create a test HTTP server
  const server = http.createServer(() => {}).listen(httpPort)

  // Create and start the DevServer
  const devServer = new DevServer({
    port: devServerPort,
    componentFilePath: join(tmpDir, "snippet.tsx"),
  })
  await devServer.start()

  // Wait for servers to be ready
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Test the DevServer
  const res = await fetch(`http://localhost:${devServerPort}`)
  expect(res.status).toBe(200)

  afterEach(async () => {
    server.close()
    await devServer.stop()
  })
})
