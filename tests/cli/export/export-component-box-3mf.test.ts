import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { renderFdmComponentBoxPng } from "circuit-json-to-fdm-component-box"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import JSZip from "jszip"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const circuitCode = `
export default () => (
  <board width="20mm" height="20mm">
    <resistor resistance="10k" footprint="0402" name="R1" pcbX={-3} />
    <resistor resistance="10k" footprint="0402" name="R2" pcbX={0} />
    <capacitor capacitance="100nF" footprint="0402" name="C1" pcbX={3} />
  </board>
)
`

test(
  "export component box 3MF",
  async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    const circuitPath = path.join(tmpDir, "assembly.circuit.tsx")
    await writeFile(circuitPath, circuitCode)

    const { stdout, stderr, exitCode } = await runCommand(
      `tsci export ${circuitPath} -f component-box-3mf`,
    )

    expect(exitCode).toBe(0)
    expect(stderr).toBe("")

    const outputPath = path.join(tmpDir, "assembly.circuit-component-box.3mf")
    const threeMf = await readFile(outputPath)
    expect(threeMf.subarray(0, 2).toString()).toBe("PK")

    const archive = await JSZip.loadAsync(threeMf)
    expect(archive.file("3D/3dmodel.model")).not.toBeNull()
    expect(stdout).toContain(`Exported to ${outputPath}!`)

    const circuitJsonPath = path.join(tmpDir, "assembly.circuit.json")
    const circuitJsonExport = await runCommand(
      `tsci export ${circuitPath} -f circuit-json -o assembly.circuit.json`,
    )
    expect(circuitJsonExport.exitCode).toBe(0)
    expect(circuitJsonExport.stderr).toBe("")

    const circuitJson = JSON.parse(
      await readFile(circuitJsonPath, "utf8"),
    ) as CircuitJson
    const previewPng = await renderFdmComponentBoxPng(
      circuitJson,
      { columns: 2 },
      { width: 640, height: 480 },
    )
    await expect(previewPng).toMatchPngSnapshot(
      import.meta.path,
      "component-box-preview",
    )
  },
  { timeout: 60_000 },
)
