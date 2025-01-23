import { test, expect, afterEach } from "bun:test"
import { DevServer } from "cli/dev/DevServer"
import { getTestFixture } from "tests/fixtures/get-test-fixture"

test("dev server handles port conflicts correctly", async () => {
  const fixture1 = await getTestFixture({
    vfs: {
      "snippet1.tsx": `
      export const MyCircuit = () => (
        <board width="10mm" height="10mm">
          <chip name="U1" footprint="soic8" />
        </board>
      )
      `,
    },
  })

  const fixture2 = await getTestFixture({
    vfs: {
      "snippet2.tsx": `
      export const MyCircuit = () => (
        <board width="10mm" height="10mm">
          <chip name="U2" footprint="soic8" />
        </board>
      )
      `,
    },
  })

  // First server should start on initial port (3020)
  const server1 = new DevServer({
    port: 3020,
    componentFilePath: `${fixture1.tempDirPath}/snippet1.tsx`,
  })
  await server1.start()

  // Second server should increment to next available port
  const server2 = new DevServer({
    port: 3020,
    componentFilePath: `${fixture2.tempDirPath}/snippet2.tsx`,
  })
  await server2.start()

  // Verify servers are running on different ports
  expect(server1.port).toBe(3020)
  expect(server2.port).toBe(3021)

  // Test error when no ports available
  const servers: DevServer[] = []
  try {
    // Try to start servers on all ports in range (3020-3029)
    for (let i = 0; i < 11; i++) {
      const server = new DevServer({
        port: 3020,
        componentFilePath: `${fixture1.tempDirPath}/snippet1.tsx`,
      })
      await server.start()
      servers.push(server)
    }
    throw new Error("Expected error when no ports available")
  } catch (error) {
    expect((error as Error).message).toContain(
      "Unable to find available port in range 3020-3029",
    )
  }

  // Cleanup
  afterEach(async () => {
    await server1.stop()
    await server2.stop()
    for (const server of servers) {
      await server.stop()
    }
  })
})
