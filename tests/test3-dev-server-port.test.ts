import { test, expect, afterEach } from "bun:test"
import * as net from "node:net"
import { DevServer } from "cli/dev/DevServer"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

const isPortAvailable = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once("error", () => resolve(false))
    server.once("listening", () => {
      server.close(() => resolve(true))
    })
    server.listen(port)
  })
}

const getAvailablePort = async (startPort: number): Promise<number> => {
  let port = startPort
  while (!(await isPortAvailable(port))) {
    port++
  }
  return port
}

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

  const availablePort = await getAvailablePort(3020)
  const devServer = new DevServer({
    port: availablePort,
    componentFilePath: `${tempDirPath}/snippet.tsx`,
  })
  await devServer.start()

  const is3020Available = await isPortAvailable(3020)
  expect(is3020Available).toBe(false)

  const isPortAvailableForDevServer = await isPortAvailable(availablePort)
  expect(isPortAvailableForDevServer).toBe(false)

  afterEach(async () => {
    await devServer.stop()
  })
})
