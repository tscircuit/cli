import { afterEach, expect, test } from "bun:test"
import { mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { temporaryDirectory } from "tempy"
import { loadProjectConfig } from "lib/project-config"

const tempDirs: string[] = []
const ENV_KEYS = ["TEST_TI_PARTNER_TOKEN", "TEST_TI_FLAG"] as const

afterEach(async () => {
  for (const envKey of ENV_KEYS) {
    delete process.env[envKey]
  }

  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  )
})

test("loadProjectConfig loads tscircuit.config.ts and project .env values", async () => {
  const tmpDir = temporaryDirectory()
  tempDirs.push(tmpDir)

  await mkdir(path.join(tmpDir, "src"), { recursive: true })
  await writeFile(path.join(tmpDir, ".env"), "TEST_TI_PARTNER_TOKEN=from-env\n")
  await writeFile(
    path.join(tmpDir, "tscircuit.config.ts"),
    [
      "export default {",
      '  mainEntrypoint: "src/main.circuit.tsx",',
      "  platformConfig: {",
      '    partsEngineDisabled: process.env.TEST_TI_PARTNER_TOKEN === "from-env",',
      "  },",
      "}",
      "",
    ].join("\n"),
  )

  const config = await loadProjectConfig(tmpDir)

  expect(config?.mainEntrypoint).toBe("src/main.circuit.tsx")
  expect(config?.platformConfig?.partsEngineDisabled).toBeTrue()
  expect(process.env.TEST_TI_PARTNER_TOKEN).toBe("from-env")
})

test("loadProjectConfig merges json config with module config", async () => {
  const tmpDir = temporaryDirectory()
  tempDirs.push(tmpDir)

  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({
      previewComponentPath: "src/preview.tsx",
      build: { kicadLibrary: true },
      pcbSnapshotSettings: { showPcbNotes: true },
    }),
  )
  await writeFile(
    path.join(tmpDir, "tscircuit.config.ts"),
    [
      "export default {",
      '  mainEntrypoint: "src/index.circuit.tsx",',
      "  build: {",
      "    previewImages: true,",
      "  },",
      "  pcbSnapshotSettings: {",
      "    showCourtyards: true,",
      "  },",
      "}",
      "",
    ].join("\n"),
  )

  const config = await loadProjectConfig(tmpDir)

  expect(config?.mainEntrypoint).toBe("src/index.circuit.tsx")
  expect(config?.previewComponentPath).toBe("src/preview.tsx")
  expect(config?.build).toEqual({
    kicadLibrary: true,
    previewImages: true,
  })
  expect(config?.pcbSnapshotSettings).toEqual({
    showPcbNotes: true,
    showCourtyards: true,
  })
})
