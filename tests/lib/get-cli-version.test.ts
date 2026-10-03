import { expect, test } from "bun:test"
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { getCliVersion } from "lib/get-cli-version"
import pkg from "../../package.json"

test("source CLI version matches its package manifest without a guessed bump", () => {
  expect(getCliVersion()).toBe(pkg.version)
})

test("published bundles read the shipped version after build-time version changes", async () => {
  const fixture = await mkdtemp(join(tmpdir(), "tsci-version-"))
  try {
    const dist = join(fixture, "dist", "cli")
    await mkdir(dist, { recursive: true })
    const entry = join(fixture, "version.ts")
    await writeFile(
      entry,
      `import { getVersionInfo } from ${JSON.stringify(join(import.meta.dir, "../../lib/getVersion.ts"))}; console.log(getVersionInfo().cliVersion)`,
    )
    const result = await Bun.build({
      entrypoints: [entry],
      target: "node",
      outdir: dist,
    })
    expect(result.success).toBe(true)

    // pver can advance more than one patch between build and publication.
    await writeFile(
      join(fixture, "package.json"),
      JSON.stringify({
        name: "@tscircuit/cli",
        version: "0.1.9999",
        type: "module",
      }),
    )
    // An unrelated nearer manifest must not override the CLI package version.
    await writeFile(
      join(dist, "package.json"),
      JSON.stringify({ name: "unrelated", version: "9.9.9", type: "module" }),
    )

    for (const runtime of ["node", process.execPath]) {
      const process = Bun.spawn([runtime, join(dist, "version.js")], {
        stdout: "pipe",
        stderr: "pipe",
      })
      expect(await process.exited).toBe(0)
      expect((await new Response(process.stdout).text()).trim()).toBe(
        "0.1.9999",
      )
    }
  } finally {
    await rm(fixture, { recursive: true, force: true })
  }
})
