import { getCliTestFixture } from "../../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, mkdir } from "node:fs/promises"
import path from "node:path"
import { getBuildEntrypoints } from "../../../../cli/build/get-build-entrypoints"

const dummyCode = `export default () => null`

test("getBuildEntrypoints returns previewComponentPath from config", async () => {
  const { tmpDir } = await getCliTestFixture()

  // Create the library entrypoint
  await writeFile(path.join(tmpDir, "index.tsx"), dummyCode)

  // Create a showcase component for preview
  await mkdir(path.join(tmpDir, "examples"), { recursive: true })
  await writeFile(path.join(tmpDir, "examples", "showcase.tsx"), dummyCode)

  // Create config with both mainEntrypoint and previewComponentPath
  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({
      mainEntrypoint: "index.tsx",
      previewComponentPath: "examples/showcase.tsx",
    }),
  )

  await writeFile(path.join(tmpDir, "package.json"), "{}")

  const result = await getBuildEntrypoints({
    rootDir: tmpDir,
    includeBoardFiles: false,
  })

  expect(result.projectDir).toBe(tmpDir)
  expect(result.mainEntrypoint).toBe(path.join(tmpDir, "index.tsx"))
  expect(result.previewComponentPath).toBe(
    path.join(tmpDir, "examples", "showcase.tsx"),
  )
})
