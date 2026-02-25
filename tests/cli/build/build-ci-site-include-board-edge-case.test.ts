import { expect, test } from "bun:test"
import { mkdir, readFile, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const mainEntrypointCode = `
export const marker = "library-entrypoint"
`

test("build --ci --concurrency with includeBoardFiles can produce an empty static site when no files match", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({
      name: "test-ci-site-include-board-edge-case",
      version: "1.0.0",
      dependencies: {
        tscircuit: "latest",
      },
    }),
  )

  await mkdir(path.join(tmpDir, "lib"), { recursive: true })
  await writeFile(path.join(tmpDir, "lib", "index.ts"), mainEntrypointCode)

  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({
      mainEntrypoint: "lib/index.ts",
      previewComponentPath: "generated/example.tsx",
      siteDefaultComponentPath: "generated/example.tsx",
      includeBoardFiles: ["generated/*.tsx"],
      alwaysUseLatestTscircuitOnCloud: true,
      prebuildCommand: 'node -e "process.exit(0)"',
    }),
  )

  const { stdout, exitCode } = await runCommand(
    "tsci build --ci --concurrency 4",
  )

  expect(exitCode).toBe(0)
  expect(stdout).toContain("Building 0 file(s) with concurrency 4...")

  await expect(
    stat(path.join(tmpDir, "dist", "index.html")),
  ).resolves.toBeTruthy()
  await expect(
    stat(path.join(tmpDir, "dist", "index.js")),
  ).resolves.toBeTruthy()
  await expect(
    stat(path.join(tmpDir, "dist", "lib", "index", "circuit.json")),
  ).rejects.toBeTruthy()

  const indexHtml = await readFile(
    path.join(tmpDir, "dist", "index.html"),
    "utf-8",
  )
  expect(indexHtml).toContain(
    "window.TSCIRCUIT_RUNFRAME_STATIC_FILE_LIST = [];",
  )
}, 60_000)
