import { afterEach, expect, test } from "bun:test"
import { DevServer } from "cli/dev/DevServer"
import getPort from "get-port"
import * as http from "node:http"
import { join } from "node:path"
import { getCliTestFixture } from "./fixtures/get-cli-test-fixture"

// Polls until the DevServer responds (any status) at the given URL.
async function waitForServerReady(url: string, timeout = 5000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try {
      await fetch(url)
      return // got a response → server is listening
    } catch {
      // connection refused → keep retrying
    }
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error(`Server at ${url} didn't start within ${timeout}ms`)
}

let server: http.Server
let devServer: DevServer

afterEach(async () => {
  server?.close()
  await devServer?.stop()
})

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

  // dummy HTTP server (just to occupy httpPort)
  server = http.createServer(() => {}).listen(httpPort)

  // start DevServer
  devServer = new DevServer({
    port: devServerPort,
    componentFilePath: join(tmpDir, "snippet.tsx"),
  })
  await devServer.start()

  // wait for ANY response at the root
  const rootUrl = `http://localhost:${devServerPort}/`
  console.log(`⏳ Waiting for DevServer at ${rootUrl}`)
  await waitForServerReady(rootUrl)

  // finally, assert GET / returns 200
  const res = await fetch(rootUrl)
  expect(res.status).toBe(200)
})
