import { rm } from "node:fs/promises"
import { resolve } from "node:path"
import { afterEach, afterAll } from "bun:test"
import { temporaryDirectory } from "tempy"
import { startServer } from "@tscircuit/fake-snippets/bun-tests/fake-snippets-api/fixtures/start-server"
import type { DbClient } from "@tscircuit/fake-snippets/fake-snippets-api/lib/db/db-client"
import { seed as seedDB } from "@tscircuit/fake-snippets/fake-snippets-api/lib/db/seed"
import { cliConfig } from "lib/cli-config"
import getPort from "get-port"

export interface CliTestFixture {
  tmpDir: string
  runCommand: (command: string) => Promise<{ stdout: string; stderr: string }>
  registryServer: any
  registryDb: DbClient
  registryApiUrl: string
  registryPort: number
}

export async function getCliTestFixture(): Promise<CliTestFixture> {
  // Setup temporary directory
  const tmpDir = temporaryDirectory()

  // Setup registry server
  const port = await getPort()
  const testInstanceId = Math.random().toString(36).substring(2, 15)
  const testDbName = `testdb${testInstanceId}`

  const { server, db } = await startServer({
    port,
    testDbName,
  })

  const apiUrl = `http://localhost:${port}/api`

  // Seed the database
  seedDB(db)

  // Configure CLI to use test server
  cliConfig.set("sessionToken", db.accounts[0].account_id)
  cliConfig.set("registryApiUrl", apiUrl)
  cliConfig.set("githubUsername", "test-user")

  // Create command runner
  const runCommand = async (command: string) => {
    const args = command.split(" ")
    if (args[0] !== "tsci") {
      throw new Error(
        `Expected command to start with \"tsci\", got: ${command}`,
      )
    }
    args[0] = resolve(process.cwd(), "cli/main.ts")

    // Set test mode environment variable
    const env = { ...process.env, TSCI_TEST_MODE: "true" }

    const task = Bun.spawn(["bun", ...args], {
      cwd: tmpDir,
      stdout: "pipe",
      stderr: "pipe",
      env,
    })

    const stdout = await new Response(task.stdout).text()
    const stderr = await new Response(task.stderr).text()

    return { stdout, stderr }
  }

  // Setup cleanup
  const cleanup = async () => {
    await rm(tmpDir, { recursive: true, force: true })
    if (server && typeof server.stop === "function") {
      await server.stop()
    }
    cliConfig.clear()
  }

  afterAll(cleanup)

  return {
    tmpDir,
    runCommand,
    registryServer: server,
    registryDb: db,
    registryApiUrl: apiUrl,
    registryPort: port,
  }
}
