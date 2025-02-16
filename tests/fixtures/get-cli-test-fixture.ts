import { mkdtemp, rm } from "node:fs/promises"
import { join, resolve } from "node:path"
import { tmpdir } from "node:os"
import { exec } from "node:child_process"
import { promisify } from "node:util"
import { afterEach } from "bun:test"

const execAsync = promisify(exec)

export interface CliTestFixture {
  tmpDir: string
  runCommand: (command: string) => Promise<{ stdout: string; stderr: string }>
}

export async function getCliTestFixture(): Promise<CliTestFixture> {
  const tmpDir = await mkdtemp(join(tmpdir(), "tsci-test-"))

  const runCommand = async (command: string) => {
    // Convert command like "tsci init" to ["cli/main.ts", "init"]
    const args = command.split(" ")
    if (args[0] !== "tsci") {
      throw new Error(`Expected command to start with "tsci", got: ${command}`)
    }
    args[0] = resolve(process.cwd(), "cli/main.ts")

    const result = await execAsync(`bun ${args.join(" ")}`, {
      cwd: tmpDir,
    })
    return result
  }

  const cleanup = async () => {
    await rm(tmpDir, { recursive: true, force: true })
  }

  afterEach(cleanup)

  return {
    tmpDir,
    runCommand,
  }
}
