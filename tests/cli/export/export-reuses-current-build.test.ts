import { expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const getCircuitCode = (resistorName: string) => `
export default () => (
  <board width="10mm" height="10mm">
    <resistor
      resistance="1k"
      footprint="0402"
      name="${resistorName}"
    />
  </board>
)
`

const getSourceComponentName = (circuitJson: unknown[]) =>
  (
    circuitJson.find(
      (element: any) => element.type === "source_component",
    ) as any
  )?.name

test(
  "export reuses a matching build, invalidates it after source changes, and build always rebuilds",
  async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    const circuitPath = path.join(tmpDir, "cached.circuit.tsx")
    const buildOutputPath = path.join(tmpDir, "dist", "cached", "circuit.json")
    const exportOutputPath = path.join(tmpDir, "cached.circuit.circuit.json")
    fs.writeFileSync(circuitPath, getCircuitCode("R1"))

    const firstBuild = await runCommand(`tsci build ${circuitPath}`)
    expect(firstBuild.exitCode).toBe(0)

    const builtCircuitJson = JSON.parse(
      fs.readFileSync(buildOutputPath, "utf-8"),
    )
    const metadata = builtCircuitJson.find(
      (element: any) => element.type === "source_project_metadata",
    )
    expect(metadata?.source_filesystem_md5_hash).toMatch(/^[a-f0-9]{32}$/)

    const cachedSourceComponent = builtCircuitJson.find(
      (element: any) => element.type === "source_component",
    )
    cachedSourceComponent.name = "FROM_CACHE"
    fs.writeFileSync(buildOutputPath, JSON.stringify(builtCircuitJson, null, 2))

    const cachedExport = await runCommand(
      `tsci export ${circuitPath} -f circuit-json`,
    )
    expect(cachedExport.exitCode).toBe(0)
    expect(
      getSourceComponentName(
        JSON.parse(fs.readFileSync(exportOutputPath, "utf-8")),
      ),
    ).toBe("FROM_CACHE")

    const forcedBuild = await runCommand(`tsci build ${circuitPath}`)
    expect(forcedBuild.exitCode).toBe(0)
    expect(
      getSourceComponentName(
        JSON.parse(fs.readFileSync(buildOutputPath, "utf-8")),
      ),
    ).toBe("R1")

    fs.writeFileSync(circuitPath, getCircuitCode("R2"))
    const invalidatedExport = await runCommand(
      `tsci export ${circuitPath} -f circuit-json`,
    )
    expect(invalidatedExport.exitCode).toBe(0)
    expect(
      getSourceComponentName(
        JSON.parse(fs.readFileSync(exportOutputPath, "utf-8")),
      ),
    ).toBe("R2")
  },
  { timeout: 30_000 },
)
