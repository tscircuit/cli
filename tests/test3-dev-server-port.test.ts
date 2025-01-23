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

  const server = net.createServer().listen(3020)

  const availablePort1 = await getAvailablePort(3020)
  const devServer1 = new DevServer({
    port: availablePort1,
    componentFilePath: `${tempDirPath}/snippet.tsx`,
  })
  await devServer1.start()

  const availablePort2 = await getAvailablePort(availablePort1 + 1)
  const devServer2 = new DevServer({
    port: availablePort2,
    componentFilePath: `${tempDirPath}/snippet.tsx`,
  })
  await devServer2.start()

  const is3020Available = await isPortAvailable(3020)
  expect(is3020Available).toBe(false)
  const isPort1Available = await isPortAvailable(availablePort1)
  expect(isPort1Available).toBe(false)

  const isPort2Available = await isPortAvailable(availablePort2)
  expect(isPort2Available).toBe(false)

  afterEach(async () => {
    await devServer1.stop()
    await devServer2.stop()
    server.close()
  })
})
