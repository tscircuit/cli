import { expect, test } from "bun:test"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

const generatorPath = path.resolve("lib/shared/generate-circuit-json.tsx")

for (const hasManifest of [false, true]) {
  test(`repro: missing JSX runtime omits ${hasManifest ? "install" : "initialization"} guidance`, async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "tsci-setup-hint-"))
    try {
      if (hasManifest) {
        await writeFile(
          path.join(directory, "package.json"),
          JSON.stringify({
            name: "uninstalled-project",
            dependencies: { react: "*", tscircuit: "*" },
          }),
        )
      }
      const filePath = path.join(directory, "index.tsx")
      await writeFile(filePath, "export default () => <board />")
      const runner = path.join(directory, "run.ts")
      await writeFile(
        runner,
        `import { generateCircuitJson } from ${JSON.stringify(generatorPath)}
try {
  await generateCircuitJson({filePath:${JSON.stringify(filePath)},projectDir:${JSON.stringify(directory)},saveToFile:false,platformConfig:{pcbDisabled:true,partsEngine:null}})
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}`,
      )
      const task = Bun.spawn([process.execPath, "--no-install", runner], {
        cwd: directory,
        stdout: "pipe",
        stderr: "pipe",
      })
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(task.stdout).text(),
        new Response(task.stderr).text(),
        task.exited,
      ])
      expect(exitCode).toBe(1)
      expect(stdout).toBe("")
      expect(stderr).toContain("react")
      // The command fails as expected; this repro records its missing hint.
      // The stacked fix changes this to require the appropriate setup command.
      expect(stderr).not.toContain(
        hasManifest ? "tsci install" : "tsci init --yes",
      )
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
}
