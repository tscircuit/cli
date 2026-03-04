import { expect, test } from "bun:test"
import { findAvailablePortForTest } from "cli/dev/register"
import getPort from "get-port"

test("findAvailablePort resolves when a port is free", async () => {
  const freePort = await getPort()
  const { port, attempts } = await findAvailablePortForTest({
    preferredPort: freePort,
    timeoutMs: 2000,
    verbose: false,
  })

  expect(port).toBe(freePort)
  expect(attempts).toBe(0)
})
