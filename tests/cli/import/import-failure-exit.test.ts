import { expect, test } from "bun:test"
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

const registerPath = path.resolve("cli/import/register.ts")

for (const scenario of ["empty", "transport", "http"] as const) {
  test(`repro: ${scenario} lookup imports nothing but exits successfully`, async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "tsci-import-exit-"))
    const runner = path.join(directory, "run.ts")
    await writeFile(
      runner,
      `import { Command } from ${JSON.stringify(import.meta.resolve("commander"))}
import { registerImport } from ${JSON.stringify(registerPath)}
globalThis.fetch = Object.assign(async () => {
  ${scenario === "transport" ? 'throw new Error("catalog unavailable")' : `return Response.json({ components: [] }, { status: ${scenario === "http" ? 503 : 200} })`}
}, { preconnect() {} })
const program = new Command()
registerImport(program)
await program.parseAsync(["import", "OPA197", "--jlcpcb"], { from: "user" })`,
    )
    try {
      const task = Bun.spawn([process.execPath, runner], {
        cwd: directory,
        env: {
          ...process.env,
          TSCIRCUIT_STANDALONE: "0",
          TSCIRCUIT_BAKED_ASSET_SERVER_BASE_URL: "",
        },
        stdout: "pipe",
        stderr: "pipe",
      })
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(task.stdout).text(),
        new Response(task.stderr).text(),
        task.exited,
      ])
      expect(stdout + stderr).toContain('No results found for "OPA197"')
      if (scenario === "transport") {
        expect(stdout + stderr).toContain("catalog unavailable")
      }
      if (scenario === "http") {
        expect(stdout + stderr).not.toContain("503")
      }
      expect(await readdir(directory)).toEqual(["run.ts"])
      // Capture the bug as an expected result so this repro can merge green.
      // The stacked fix changes this expectation to a nonzero exit status.
      expect(exitCode).toBe(0)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
}
