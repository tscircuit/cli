import { test, expect } from "bun:test"
import { join } from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import getPort from "get-port"

test(
  "tsci add - shows auth error message when 401 from registry",
  async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()

    // Create a fake server that returns 401 for all requests
    const port = await getPort()
    const server = Bun.serve({
      port,
      fetch: () => {
        return new Response(
          JSON.stringify({
            error: {
              error_code: "unauthorized",
              message: "Authentication required",
            },
          }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        )
      },
    })

    try {
      // Create package.json
      await Bun.write(
        join(tmpDir, "package.json"),
        JSON.stringify({
          name: "test-project",
          dependencies: {},
        }),
      )

      // Create .npmrc pointing to our fake server (no auth token in project npmrc)
      await Bun.write(
        join(tmpDir, ".npmrc"),
        `@tsci:registry=http://localhost:${port}\n`,
      )

      const { stdout, stderr } = await runCommand("tsci add @tsci/test.package")
      const output = stdout + stderr

      // Should show auth error message prompting user to run tsci auth setup-npmrc
      // The exact message depends on whether a token exists in ~/.npmrc:
      // - "No tscircuit session token" if no token found anywhere
      // - "missing or expired" if token exists but is invalid
      expect(output).toContain("tsci auth setup-npmrc")
      expect(
        output.includes("No tscircuit session token") ||
          output.includes("missing or expired"),
      ).toBe(true)
    } finally {
      server.stop()
    }
  },
  { timeout: 30_000 },
)

test(
  "tsci add - shows expired token message when 401 and has npmrc token",
  async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()

    // Create a fake server that returns 401 for all requests
    const port = await getPort()
    const server = Bun.serve({
      port,
      fetch: () => {
        return new Response(
          JSON.stringify({
            error: {
              error_code: "token_expired",
              message: "Token expired",
            },
          }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        )
      },
    })

    try {
      // Create package.json
      await Bun.write(
        join(tmpDir, "package.json"),
        JSON.stringify({
          name: "test-project",
          dependencies: {},
        }),
      )

      // Create .npmrc with registry AND auth token
      await Bun.write(
        join(tmpDir, ".npmrc"),
        `@tsci:registry=http://localhost:${port}\n//npm.tscircuit.com/:_authToken=expired-token-123\n`,
      )

      const { stdout, stderr } = await runCommand("tsci add @tsci/test.package")
      const output = stdout + stderr

      // Should show the expired token message
      expect(output).toContain("missing or expired")
      expect(output).toContain("tsci auth setup-npmrc")
    } finally {
      server.stop()
    }
  },
  { timeout: 30_000 },
)
