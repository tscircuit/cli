import { rm } from "node:fs/promises"
import { resolve } from "node:path"
import { temporaryDirectory } from "tempy"
import { startServer } from "./start-server"
import type { DbClient } from "@tscircuit/fake-snippets"
import { seed as seedDB } from "@tscircuit/fake-snippets"
import { getCliConfig } from "lib/cli-config"
import getPort from "get-port"
import * as jwt from "jsonwebtoken"
import * as path from "node:path"

export interface CliTestFixture {
  tmpDir: string
  runCommand: (command: string) => Promise<{ stdout: string; stderr: string }>
  registryServer: any
  registryDb: DbClient
  registryApiUrl: string
  registryPort: number
}

export async function getCliTestFixture(
  opts: {
    loggedIn?: boolean
  } = {},
): Promise<CliTestFixture> {
  // Setup temporary directory
  const tmpDir = temporaryDirectory()

  // Setup registry server
  const port = await getPort()
  const testInstanceId = Math.random().toString(36).substring(2, 15)
  const testDbName = `testdb${testInstanceId}`
  const testConfigDir = path.join(tmpDir, ".config")

  const { server, db } = await startServer({
    port,
    testDbName,
  })

  const apiUrl = `http://localhost:${port}/api`

  // Seed the database
  seedDB(db)

  const cliConfig = getCliConfig({ configDir: testConfigDir })

  // example seed data: the package "testuser/my-test-board"
  // see all the seed data in the fake-snippets-api repo

  // Configure CLI to use test server
  cliConfig.set("registryApiUrl", apiUrl)

  if (opts.loggedIn) {
    // Create personal organization for the test account
    const personalOrg = db.addOrganization({
      name: "test-user",
      owner_account_id: db.accounts[0].account_id,
      is_personal_org: true,
    })

    // Add the account as a member of their personal org
    db.addOrganizationAccount({
      org_id: personalOrg.org_id,
      account_id: db.accounts[0].account_id,
      is_owner: true,
    })

    // Update the account to have the personal_org_id
    db.accounts[0].personal_org_id = personalOrg.org_id

    // Use account_id directly as the token (not JWT) to match fake-snippets expectations
    const token = db.accounts[0].account_id
    cliConfig.set("githubUsername", "test-user")
    cliConfig.set("sessionToken", token)
    cliConfig.set("accountId", db.accounts[0].account_id)
    cliConfig.set("sessionId", "session-123")
  }

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
    const env = {
      ...process.env,
      TSCI_TEST_MODE: "true",
      FORCE_COLOR: "0",
      NODE_ENV: "test",
      TSCIRCUIT_CONFIG_DIR: testConfigDir,
    }

    let stdout = ""
    let stderr = ""

    // Ensure the directory exists before running commands
    const fs = require('node:fs');
    fs.mkdirSync(tmpDir, { recursive: true });
    
    const task = Bun.spawn(["bun", ...args], {
      cwd: tmpDir,
      stdout: "pipe",
      stderr: "pipe",
      env,
    })

    // Stream stdout to console and capture
    const stdoutReader = task.stdout.getReader()
    const stderrReader = task.stderr.getReader()

    const readStream = async (
      reader: ReadableStreamDefaultReader<Uint8Array>,
      writeFn: (chunk: string) => void,
      collectFn: (chunk: string) => void,
    ) => {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = new TextDecoder().decode(value)
        writeFn(chunk)
        collectFn(chunk)
      }
    }

    await Promise.all([
      readStream(
        stdoutReader,
        (chunk) => process.stdout.write(chunk),
        (chunk) => {
          stdout += chunk
        },
      ),
      readStream(
        stderrReader,
        (chunk) => process.stderr.write(chunk),
        (chunk) => {
          stderr += chunk
        },
      ),
      task.exited,
    ])

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

  globalThis.deferredCleanupFns.push(cleanup)

  return {
    tmpDir,
    runCommand,
    registryServer: server,
    registryDb: db,
    registryApiUrl: apiUrl,
    registryPort: port,
  }
}
