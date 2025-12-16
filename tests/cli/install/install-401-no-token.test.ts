import { test, expect } from "bun:test"
import { join } from "node:path"
import { mkdir } from "node:fs/promises"
import { temporaryDirectory } from "tempy"
import getPort from "get-port"

test(
  "tsci install - shows auth error message when 401 from registry",
  async () => {
    const tmpDir = temporaryDirectory()

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
      // Create circuits directory with a file that imports a @tsci package
      const circuitDir = join(tmpDir, "circuits")
      await mkdir(circuitDir, { recursive: true })
      await Bun.write(
        join(circuitDir, "index.circuit.tsx"),
        'import { MyComponent } from "@tsci/test.package"\nexport default () => <board width={10} height={10}><MyComponent /></board>\n',
      )

      // Create package.json with the @tsci dependency
      await Bun.write(
        join(tmpDir, "package.json"),
        JSON.stringify({
          name: "test-project",
          dependencies: {
            "@tsci/test.package": "latest",
          },
        }),
      )

      // Create .npmrc pointing to our fake server (no auth token in project npmrc)
      await Bun.write(
        join(tmpDir, ".npmrc"),
        `@tsci:registry=http://localhost:${port}\n`,
      )

      // Run tsci install
      const args = ["bun", join(process.cwd(), "cli/main.ts"), "install"]

      const task = Bun.spawn(args, {
        cwd: tmpDir,
        stdout: "pipe",
        stderr: "pipe",
        env: {
          ...process.env,
          TSCI_TEST_MODE: "true",
          FORCE_COLOR: "0",
          NODE_ENV: "test",
        },
      })

      let stdout = ""
      let stderr = ""

      const stdoutReader = task.stdout.getReader()
      const stderrReader = task.stderr.getReader()

      const readStream = async (
        reader: ReadableStreamDefaultReader<Uint8Array>,
      ) => {
        let result = ""
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          result += new TextDecoder().decode(value)
        }
        return result
      }
      ;[stdout, stderr] = await Promise.all([
        readStream(stdoutReader),
        readStream(stderrReader),
        task.exited,
      ])

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
  "tsci install - shows expired token message when 401 and has npmrc token",
  async () => {
    const tmpDir = temporaryDirectory()

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
            message: "Token expired",
          }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        )
      },
    })

    try {
      // Create circuits directory with a file that imports a @tsci package
      const circuitDir = join(tmpDir, "circuits")
      await mkdir(circuitDir, { recursive: true })
      await Bun.write(
        join(circuitDir, "index.circuit.tsx"),
        'import { MyComponent } from "@tsci/test.package"\nexport default () => <board width={10} height={10}><MyComponent /></board>\n',
      )

      // Create package.json with the @tsci dependency
      await Bun.write(
        join(tmpDir, "package.json"),
        JSON.stringify({
          name: "test-project",
          dependencies: {
            "@tsci/test.package": "latest",
          },
        }),
      )

      // Create .npmrc with registry AND auth token
      await Bun.write(
        join(tmpDir, ".npmrc"),
        `@tsci:registry=http://localhost:${port}\n//npm.tscircuit.com/:_authToken=expired-token-123\n`,
      )

      // Run tsci install
      const args = ["bun", join(process.cwd(), "cli/main.ts"), "install"]

      const task = Bun.spawn(args, {
        cwd: tmpDir,
        stdout: "pipe",
        stderr: "pipe",
        env: {
          ...process.env,
          TSCI_TEST_MODE: "true",
          FORCE_COLOR: "0",
          NODE_ENV: "test",
        },
      })

      let stdout = ""
      let stderr = ""

      const stdoutReader = task.stdout.getReader()
      const stderrReader = task.stderr.getReader()

      const readStream = async (
        reader: ReadableStreamDefaultReader<Uint8Array>,
      ) => {
        let result = ""
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          result += new TextDecoder().decode(value)
        }
        return result
      }
      ;[stdout, stderr] = await Promise.all([
        readStream(stdoutReader),
        readStream(stderrReader),
        task.exited,
      ])

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
