import { mkdtemp, rm } from "node:fs/promises"
import { join, resolve } from "node:path"
import { tmpdir } from "node:os"
import { spawn } from "node:child_process"
import { afterEach } from "bun:test"

export interface CliTestFixture {
  tmpDir: string
  runCommand: (command: string) => Promise<{ stdout: string; stderr: string }>
}

export async function getCliTestFixture(): Promise<CliTestFixture> {
  const tmpDir = await mkdtemp(join(tmpdir(), "tsci-test-"))

  const runCommand = async (command: string) => {
    const args = command.split(" ")
    if (args[0] !== "tsci") {
      throw new Error(`Expected command to start with "tsci", got: ${command}`)
    }
    args[0] = resolve(process.cwd(), "cli/main.ts")

    return new Promise<{ stdout: string; stderr: string }>(
      (resolve, reject) => {
        const child = spawn("bun", args, { cwd: tmpDir })

        let stdout = ""
        let stderr = ""

        child.stdout.on("data", (data) => {
          stdout += data.toString()
        })

        child.stderr.on("data", (data) => {
          stderr += data.toString()
        })

        child.on("close", (code) => {
          if (code === 0) {
            resolve({ stdout, stderr })
          } else {
            reject(
              new Error(`Command failed with exit code ${code}\n${stderr}`),
            )
          }
        })

        child.on("error", (err) => {
          reject(err)
        })
      },
    )
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
