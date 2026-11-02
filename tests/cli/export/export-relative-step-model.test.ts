import { expect, test } from "bun:test"
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test(
  "GLB and GLTF export include a relative local STEP model",
  async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    const projectDir = path.join(tmpDir, "nested-project")
    await mkdir(path.join(projectDir, "libraries"), { recursive: true })
    await copyFile(
      path.join(import.meta.dir, "../assets/SW_Push_1P1T_NO_CK_KMR2.step"),
      path.join(projectDir, "libraries", "switch.step"),
    )
    const circuitPath = path.join(projectDir, "switch.circuit.tsx")
    await writeFile(
      circuitPath,
      `
export default () => (
  <board width="20mm" height="20mm">
    <chip name="SW1" footprint="pushbutton"
      cadModel={<cadmodel modelUrl="./libraries/switch.step" />} />
  </board>
)
`,
    )

    for (const format of ["glb", "gltf"]) {
      const { stdout, stderr, exitCode } = await runCommand(
        `tsci export ${circuitPath} -f ${format}`,
      )
      const exported = await readFile(
        path.join(projectDir, `switch.circuit.${format}`),
      )
      const document =
        format === "glb"
          ? JSON.parse(
              exported.subarray(20, 20 + exported.readUInt32LE(12)).toString(),
            )
          : JSON.parse(exported.toString())
      // The STEP mesh is named after its source URL. A valid GLB header alone
      // would also pass when conversion silently drops the component model.
      const modelNodes = document.nodes.filter((node: { name?: string }) =>
        node.name?.includes("switch.step"),
      )
      expect({
        format,
        modelNodes: modelNodes.map((node: { name: string; mesh?: number }) => ({
          name: node.name.replace(/^.*libraries\//, "libraries/"),
          hasMesh: typeof node.mesh === "number",
        })),
      }).toMatchSnapshot()
      expect(exitCode).toBe(0)
      expect(`${stdout}\n${stderr}`).not.toContain("Failed to load")
      expect(modelNodes.length).toBeGreaterThan(0)
    }
  },
  { timeout: 60_000 },
)
