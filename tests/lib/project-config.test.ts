import { afterEach, expect, test } from "bun:test"
import { mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { temporaryDirectory } from "tempy"
import {
  loadProjectConfigSync,
  loadRuntimeProjectConfig,
  saveProjectConfig,
} from "lib/project-config"
import { projectConfigSchema } from "lib/project-config/project-config-schema"
import jsonSchema from "../../types/tscircuit.config.schema.json"

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

test.each([true, false])(
  "JSON config preserves useCloudAutorouting=%s and passes it to core",
  async (useCloudAutorouting) => {
    const tmpDir = temporaryDirectory()
    tempDirs.push(tmpDir)

    await writeFile(
      path.join(tmpDir, "tscircuit.config.json"),
      JSON.stringify({ useCloudAutorouting }),
    )

    const config = loadProjectConfigSync(tmpDir)
    expect(config?.useCloudAutorouting).toBe(useCloudAutorouting)
    expect(saveProjectConfig(config, tmpDir)).toBeTrue()
    expect(loadProjectConfigSync(tmpDir)?.useCloudAutorouting).toBe(
      useCloudAutorouting,
    )
    expect(
      (await loadRuntimeProjectConfig(tmpDir))?.platformConfig
        ?.useCloudAutorouter,
    ).toBe(useCloudAutorouting)
  },
)

test("cloud autorouting is optional in both config schemas", async () => {
  const tmpDir = temporaryDirectory()
  tempDirs.push(tmpDir)
  await writeFile(path.join(tmpDir, "tscircuit.config.json"), "{}")

  expect(projectConfigSchema.parse({}).useCloudAutorouting).toBeUndefined()
  expect(jsonSchema.properties.useCloudAutorouting.type).toBe("boolean")
  expect(
    (await loadRuntimeProjectConfig(tmpDir))?.platformConfig,
  ).toBeUndefined()
})

test.each(["true", "false", 1, 0, null, {}, []].map((value) => [value]))(
  "cloud autorouting rejects non-boolean value %j",
  (useCloudAutorouting) => {
    expect(
      projectConfigSchema.safeParse({ useCloudAutorouting }).success,
    ).toBeFalse()
  },
)

test.each([true, false])(
  "module cloud autorouting setting %s overrides JSON and preserves platform hooks",
  async (useCloudAutorouting) => {
    const tmpDir = temporaryDirectory()
    tempDirs.push(tmpDir)
    await writeFile(
      path.join(tmpDir, "tscircuit.config.json"),
      JSON.stringify({ useCloudAutorouting: !useCloudAutorouting }),
    )
    await writeFile(
      path.join(tmpDir, "tscircuit.config.ts"),
      `export default {
        useCloudAutorouting: ${useCloudAutorouting},
        platformConfig: { localCacheEngine: { getItem: () => null, setItem: () => {} } },
      }`,
    )

    const config = await loadRuntimeProjectConfig(tmpDir)
    expect(config?.useCloudAutorouting).toBe(useCloudAutorouting)
    expect(config?.platformConfig?.useCloudAutorouter).toBe(useCloudAutorouting)
    expect(config?.platformConfig?.localCacheEngine?.getItem("test")).toBeNull()
  },
)

test.each([true, false])(
  "explicit platform useCloudAutorouter=%s overrides the project shorthand",
  async (useCloudAutorouter) => {
    const tmpDir = temporaryDirectory()
    tempDirs.push(tmpDir)
    await writeFile(
      path.join(tmpDir, "tscircuit.config.json"),
      JSON.stringify({ useCloudAutorouting: !useCloudAutorouter }),
    )
    await writeFile(
      path.join(tmpDir, "tscircuit.config.ts"),
      `export default { platformConfig: { useCloudAutorouter: ${useCloudAutorouter} } }`,
    )

    expect(
      (await loadRuntimeProjectConfig(tmpDir))?.platformConfig
        ?.useCloudAutorouter,
    ).toBe(useCloudAutorouter)
  },
)

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

  const config = await loadRuntimeProjectConfig(tmpDir)

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

  const config = await loadRuntimeProjectConfig(tmpDir)

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
