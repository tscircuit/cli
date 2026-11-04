import { expect, test } from "bun:test"
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { renderGLTFToPNGFromGLB } from "poppygl"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

interface ExportedGltfScene {
  nodes: { name?: string; mesh?: number }[]
  meshes: { primitives: { attributes: { POSITION: number } }[] }[]
  accessors: { count: number }[]
}

function getMeshVertexCount(gltfScene: ExportedGltfScene, meshIndex?: number) {
  if (meshIndex === undefined) return 0
  return gltfScene.meshes[meshIndex].primitives.reduce(
    (vertexCount, primitive) =>
      vertexCount + gltfScene.accessors[primitive.attributes.POSITION].count,
    0,
  )
}

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
    // KMR2 pad centres (+/-2.05, +/-0.8 mm), 0.9 x 1 mm SMD lands:
    // KiCad Button_Switch_SMD/SW_Push_1P1T_NO_CK_KMR2.kicad_mod.
    const circuitPath = path.join(projectDir, "switch.circuit.tsx")
    await writeFile(
      circuitPath,
      `
export default () => (
  <board width="10mm" height="8mm">
    <chip name="SW1" footprint="smdpushbutton4_px4.1mm_py1.6mm_pw0.9mm_ph1mm"
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
      if (format === "glb") {
        await expect(
          renderGLTFToPNGFromGLB(new Uint8Array(exported).buffer, {
            width: 640,
            height: 480,
            camPos: [10, 10, 14],
            lookAt: [0, 0, 0],
            backgroundColor: [0.94, 0.96, 0.98],
          }),
        ).toMatchPngSnapshot(import.meta.path)
      }
      const gltfScene: ExportedGltfScene =
        format === "glb"
          ? JSON.parse(
              exported.subarray(20, 20 + exported.readUInt32LE(12)).toString(),
            )
          : JSON.parse(exported.toString())
      // A valid GLB header also passes when the model is silently dropped.
      // The fixture STEP contains thousands of vertices, unlike a fallback box.
      const modelNodes = gltfScene.nodes.filter((node) => node.name === "SW1")
      expect({
        format,
        modelNodes: modelNodes.map((node) => ({
          name: node.name,
          vertexCount: getMeshVertexCount(gltfScene, node.mesh),
        })),
      }).toMatchSnapshot()
      expect(exitCode).toBe(0)
      expect(`${stdout}\n${stderr}`).not.toContain("Failed to load")
      expect(modelNodes.length).toBeGreaterThan(0)
      expect(getMeshVertexCount(gltfScene, modelNodes[0].mesh)).toBeGreaterThan(
        1000,
      )
    }
  },
  { timeout: 60_000 },
)
