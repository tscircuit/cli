import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { copyFile, mkdir, writeFile, readFile } from "node:fs/promises"
import path from "node:path"

const circuitCode = `
export default () => (
  <board width="10mm" height="10mm">
    <resistor
      resistance="1k"
      footprint="0402"
      name="R1"
      schX={3}
      pcbX={3}
    />
    <capacitor
      capacitance="1000pF"
      footprint="0402"
      name="C1"
      schX={-3}
      pcbX={-3}
    />
    <trace from=".R1 > .pin1" to=".C1 > .pin1" />
  </board>
)`

test(
  "export glb",
  async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    const circuitPath = path.join(tmpDir, "test-circuit.tsx")

    await writeFile(circuitPath, circuitCode)

    await runCommand(`tsci export ${circuitPath} -f glb`)

    const glbFile = await readFile(path.join(tmpDir, "test-circuit.glb"))
    expect(glbFile.subarray(0, 4).toString()).toBe("glTF")
  },
  { timeout: 20000 },
)

const parseGlbJson = (glb: Buffer) => {
  const jsonLength = glb.readUInt32LE(12)
  const jsonText = glb.subarray(20, 20 + jsonLength).toString("utf8")
  return JSON.parse(jsonText)
}

test(
  "export -f glb and -f gltf load relative cadModel stepUrl",
  async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    const glbProjDir = path.join(tmpDir, "glb-proj")
    const glbLibrariesDir = path.join(glbProjDir, "libraries")
    await mkdir(glbLibrariesDir, { recursive: true })
    await copyFile(
      path.join(import.meta.dir, "../assets/SW_Push_1P1T_NO_CK_KMR2.step"),
      path.join(glbLibrariesDir, "cap.step"),
    )

    const subDir = path.join(tmpDir, "sub")
    const subLibrariesDir = path.join(subDir, "libraries")
    await mkdir(subLibrariesDir, { recursive: true })
    await copyFile(
      path.join(import.meta.dir, "../assets/SW_Push_1P1T_NO_CK_KMR2.step"),
      path.join(subLibrariesDir, "cap.step"),
    )

    const circuitWithStep = `export default () => (
  <board width="10mm" height="10mm">
    <capacitor
      name="C1"
      capacitance="100nF"
      footprint="0402"
      cadModel={{ stepUrl: "./libraries/cap.step" }}
    />
  </board>
)
`
    const glbCircuitPath = path.join(glbProjDir, "index.tsx")
    await writeFile(glbCircuitPath, circuitWithStep)

    const subCircuitPath = path.join(subDir, "index.tsx")
    await writeFile(subCircuitPath, circuitWithStep)

    const glbRes = await runCommand(
      `tsci export ${glbCircuitPath} -f glb -o export.glb`,
    )
    expect(glbRes.exitCode).toBe(0)
    expect(glbRes.stderr).not.toContain("Failed to load STEP")
    expect(glbRes.stderr).not.toContain("404 Not Found")

    const glbBuffer = await readFile(path.join(glbProjDir, "export.glb"))
    expect(glbBuffer.subarray(0, 4).toString()).toBe("glTF")
    const glbJson = parseGlbJson(glbBuffer)
    expect(glbJson.meshes?.length ?? 0).toBeGreaterThanOrEqual(2)

    const gltfRes = await runCommand(
      "tsci export sub/index.tsx -f gltf -o export.gltf",
    )
    expect(gltfRes.exitCode).toBe(0)
    expect(gltfRes.stderr).not.toContain("Failed to load STEP")
    expect(gltfRes.stderr).not.toContain("404 Not Found")

    const gltfJson = JSON.parse(
      await readFile(path.join(subDir, "export.gltf"), "utf-8"),
    )
    expect(gltfJson.meshes?.length ?? 0).toBeGreaterThanOrEqual(2)
  },
  { timeout: 40000 },
)
