import { rm } from "node:fs/promises"
import { resolve } from "node:path"
import { exec } from "node:child_process"
import { promisify } from "node:util"
import { afterAll } from "bun:test"
import { temporaryDirectory } from "tempy"

const execAsync = promisify(exec)

export interface CliTestFixture {
  tmpDir: string
  runCommand: (command: string) => Promise<{ stdout: string; stderr: string }>
}

export async function getCliTestFixture(): Promise<CliTestFixture> {
  const tmpDir = temporaryDirectory()

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

  afterAll(cleanup)

  return {
    tmpDir,
    runCommand,
  }
}
