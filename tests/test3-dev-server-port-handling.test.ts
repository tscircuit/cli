import { test, expect, afterEach } from "bun:test"
import { DevServer } from "cli/dev/DevServer"
import { getTestFixture } from "tests/fixtures/get-test-fixture"
import { type Server, createServer } from "node:http"

let blockingServer: Server | undefined
let devServer: DevServer | undefined

test("dev server finds available port when preferred port is taken", async () => {
  // Create a server blocking port 3020
  blockingServer = createServer()
  await new Promise<void>((resolve) => {
    blockingServer!.listen(3020, () => resolve())
  })

  const fixture = await getTestFixture({
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

  // Start dev server with preferred port 3020
  devServer = new DevServer({
    port: 3020,
    componentFilePath: `${fixture.tempDirPath}/snippet.tsx`,
  })
  await devServer.start()

  // Verify server got a different port
  expect(devServer.port).not.toBe(3020)
  expect(devServer.httpServer?.address()).toBeTruthy()

  // Verify server is actually running by making a request
  const response = await fetch(`http://localhost:${devServer.port}/`)
  expect(response.status).toBe(200)
})

// Cleanup servers after each test
afterEach(async () => {
  if (devServer) {
    await devServer.stop()
    devServer = undefined
  }
  if (blockingServer) {
    await new Promise<void>((resolve) => {
      blockingServer!.close(() => resolve())
    })
    blockingServer = undefined
  }
})
