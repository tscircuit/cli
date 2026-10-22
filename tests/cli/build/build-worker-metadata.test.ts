import { expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { buildFile } from "cli/build/build-file"
import { handleBuildFile } from "cli/build/worker-build-handlers"
import { getOrGenerateCircuitJson } from "lib/shared/get-or-generate-circuit-json"
import { getPlatformConfigWithCliDefaults } from "lib/shared/get-platform-config-with-cli-defaults"

test("worker rebuilds refresh metadata and prebuilt writes remove stale sidecars", async () => {
  const projectDir = await mkdtemp(join(tmpdir(), "worker-metadata-"))
  try {
    await symlink(
      join(process.cwd(), "node_modules"),
      join(projectDir, "node_modules"),
    )
    await writeFile(join(projectDir, "package.json"), "{}")
    const filePath = join(projectDir, "main.circuit.tsx")
    const prebuilt = join(projectDir, "saved.circuit.json")
    await writeFile(prebuilt, "[]")
    await writeFile(
      filePath,
      `export const modeling = { description: "worker model" }
export default ({ width = 10 }) => <board width={width} height={6} />`,
    )
    const output = join(projectDir, "dist", "main", "circuit.json")
    const metadataPath = `${output}.metadata.json`
    const platformConfig = getPlatformConfigWithCliDefaults(
      {
        partsEngineDisabled: true,
        schematicDisabled: true,
        routingDisabled: true,
      },
      { projectDir },
    )
    const options = { platformConfig }
    const input = { filePath, projectDir, platformConfig }
    const width = (records: any[]) =>
      records.find((record) => record.type === "pcb_board").width
    const workerBuild = (
      file: string,
      injectedProps?: Record<string, unknown>,
    ) =>
      handleBuildFile(
        file,
        output,
        undefined,
        undefined,
        undefined,
        projectDir,
        { ...options, injectedProps },
        () => {},
        () => {},
      )

    expect((await buildFile(filePath, output, projectDir, options)).ok).toBe(
      true,
    )
    const originalMetadata = JSON.parse(await readFile(metadataPath, "utf8"))
    expect((await workerBuild(filePath, { width: 20 })).ok).toBe(true)
    const workerMetadata = JSON.parse(await readFile(metadataPath, "utf8"))
    expect(workerMetadata.renderOptionsHash).not.toBe(
      originalMetadata.renderOptionsHash,
    )
    expect(workerMetadata.modeling.description).toBe("worker model")
    const cachedWorker = await getOrGenerateCircuitJson({
      ...input,
      injectedProps: { width: 20 },
    })
    expect(cachedWorker.cacheHit).toBe(true)
    expect(width(cachedWorker.circuitJson)).toBe(20)
    const rebuiltDefault = await getOrGenerateCircuitJson(input)
    expect(rebuiltDefault.cacheHit).toBe(false)
    expect(width(rebuiltDefault.circuitJson)).toBe(10)

    expect((await buildFile(filePath, output, projectDir, options)).ok).toBe(
      true,
    )
    expect((await getOrGenerateCircuitJson(input)).cacheHit).toBe(true)
    expect((await workerBuild(prebuilt)).ok).toBe(true)
    expect(existsSync(metadataPath)).toBe(false)
    expect(JSON.parse(await readFile(output, "utf8"))).toEqual([])
    expect((await getOrGenerateCircuitJson(input)).cacheHit).toBe(false)

    expect((await workerBuild(filePath)).ok).toBe(true)
    expect(existsSync(metadataPath)).toBe(true)
    expect((await buildFile(prebuilt, output, projectDir, options)).ok).toBe(
      true,
    )
    expect(existsSync(metadataPath)).toBe(false)
    expect(JSON.parse(await readFile(output, "utf8"))).toEqual([])
    expect((await getOrGenerateCircuitJson(input)).cacheHit).toBe(false)
  } finally {
    await rm(projectDir, { recursive: true, force: true })
  }
}, 30_000)
