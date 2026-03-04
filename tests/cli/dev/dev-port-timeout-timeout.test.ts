import { expect, test } from "bun:test"
import net from "node:net"
import { findAvailablePortForTest } from "cli/dev/register"
import getPort from "get-port"

const startServerOnPort = async (port: number) =>
  new Promise<net.Server>((resolve, reject) => {
    const server = net.createServer()
    server.once("error", reject)
    server.listen(port, () => resolve(server))
  })

test("findAvailablePort times out when no port becomes available", async () => {
  const busyPort = await getPort()
  const servers = [
    await startServerOnPort(busyPort),
    await startServerOnPort(busyPort + 1),
    await startServerOnPort(busyPort + 2),
  ]

  try {
    await expect(
      findAvailablePortForTest({
        preferredPort: busyPort,
        timeoutMs: 200,
        verbose: false,
      }),
    ).rejects.toThrow(/Unable to find an open port/)
  } finally {
    servers.forEach((s) => s.close())
  }
})
