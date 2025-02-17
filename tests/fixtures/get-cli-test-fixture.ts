import { rm } from "node:fs/promises"
import { resolve } from "node:path"
import { afterEach } from "bun:test"
import { temporaryDirectory } from "tempy"

export interface CliTestFixture {
  tmpDir: string
  runCommand: (command: string) => Promise<{ stdout: string; stderr: string }>
}

export async function getCliTestFixture(): Promise<CliTestFixture> {
  const tmpDir = temporaryDirectory()

  const runCommand = async (command: string) => {
    const args = command.split(" ")
    if (args[0] !== "tsci") {
      throw new Error(
        `Expected command to start with \"tsci\", got: ${command}`,
      )
    }
    args[0] = resolve(process.cwd(), "cli/main.ts")

    const task = Bun.spawn(["bun", ...args], {
      cwd: tmpDir,
      stdout: "pipe",
      stderr: "pipe",
    })

    const stdout = await new Response(task.stdout).text()
    const stderr = await new Response(task.stderr).text()

    return { stdout, stderr }
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
