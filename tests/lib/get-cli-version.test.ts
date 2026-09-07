import { afterEach, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { version as sourceVersion } from "../../package.json"

const temporaryDirectories: string[] = []
let cachedBundle: string | undefined

afterEach(async () => {
  for (const directory of temporaryDirectories.splice(0)) {
    await rm(directory, { recursive: true, force: true })
  }
})

const createBundle = async (outputPath: string) => {
  const root = await mkdtemp(join(tmpdir(), "cli-version-"))
  temporaryDirectories.push(root)
  const entrypoint = join(root, "entry.ts")
  const getVersionPath = fileURLToPath(
    new URL("../../lib/getVersion.ts", import.meta.url),
  )
  const helperPath = fileURLToPath(
    new URL("../../lib/shared/get-cli-version.ts", import.meta.url),
  )
  await writeFile(
    entrypoint,
    `
    import { getVersion, getVersionInfo } from ${JSON.stringify(getVersionPath)}
    import { getCliVersion } from ${JSON.stringify(helperPath)}
    Object.assign(globalThis, { TSCIRCUIT_VERSION: "9.9.9" })
    console.log(JSON.stringify({
      cli: getVersionInfo(() => undefined).cliVersion,
      currentCli: getCliVersion(),
      wrapper: getVersion(),
    }))
  `,
  )
  const output = join(root, outputPath)
  if (cachedBundle === undefined) {
    const build = await Bun.build({
      entrypoints: [entrypoint],
      target: "node",
      format: "esm",
    })
    expect(build.success).toBe(true)
    const artifact = build.outputs[0]
    if (!artifact) throw new TypeError("Missing version test bundle")
    const text: string = await artifact.text()
    cachedBundle = text
  }
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, cachedBundle)
  await writeFile(join(root, "dist", "package.json"), '{"type":"module"}')
  const cwd = join(root, "unrelated-project")
  await mkdir(cwd)
  await writeFile(
    join(cwd, "package.json"),
    '{"name":"@tscircuit/cli","version":"8.8.8"}',
  )
  return { root, output, cwd }
}

const runBundle = async (fixture: Awaited<ReturnType<typeof createBundle>>) => {
  const results: unknown[] = []
  // Exercise the node-target bundle in both supported runtimes.
  for (const executable of [process.execPath, "node"]) {
    const result = Bun.spawnSync([executable, fixture.output], {
      cwd: fixture.cwd,
    })
    expect(result.exitCode).toBe(0)
    results.push(JSON.parse(result.stdout.toString()))
  }
  return results
}

for (const layout of ["dist/cli/main.js", "dist/lib/index.js"]) {
  test(`${layout} reports the installed version when inline metadata is stale`, async () => {
    // Given a bundle built before the installed manifest receives its new version.
    const fixture = await createBundle(layout)
    await writeFile(
      join(fixture.root, "package.json"),
      JSON.stringify({
        name: "@tscircuit/cli",
        version: "0.1.2021",
        type: "module",
        exports: { ".": "./dist/cli/main.js", "./lib": "./dist/lib/index.js" },
      }),
    )
    // When the bundle runs from an unrelated package directory.
    const results = await runBundle(fixture)
    // Then CLI and wrapper versions remain distinct and no patch is guessed.
    for (const result of results) {
      expect(result).toEqual({
        cli: "0.1.2021",
        currentCli: "0.1.2021",
        wrapper: "9.9.9",
      })
    }
  })

  for (const [description, manifest] of [
    ["missing", undefined],
    ["malformed JSON", "{"],
    [
      "wrong package name",
      JSON.stringify({ name: "tscircuit", version: "8.8.8" }),
    ],
    [
      "invalid version",
      JSON.stringify({ name: "@tscircuit/cli", version: "not-semver" }),
    ],
    ["missing version", JSON.stringify({ name: "@tscircuit/cli" })],
  ]) {
    test(`${layout} uses the unchanged source fallback for ${description} metadata`, async () => {
      // Given unavailable or invalid installed metadata and a different CWD manifest.
      const fixture = await createBundle(layout)
      if (manifest !== undefined)
        await writeFile(join(fixture.root, "package.json"), manifest)
      // When the actual bundle reads its own installation metadata.
      const results = await runBundle(fixture)
      // Then fallback uses the exact source version, not a guessed next release.
      for (const result of results) {
        expect(result).toEqual({
          cli: sourceVersion,
          currentCli: sourceVersion,
          wrapper: "9.9.9",
        })
      }
    })
  }
}
