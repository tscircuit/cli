import { expect, test } from "bun:test"
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { renderGLTFToPNGFromGLB } from "poppygl"
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
      if (format === "glb") {
        await expect(
          renderGLTFToPNGFromGLB(new Uint8Array(exported).buffer, {
            width: 640,
            height: 480,
            camPos: [30, 30, 30],
            lookAt: [0, 0, 0],
            backgroundColor: [0.94, 0.96, 0.98],
          }),
        ).toMatchPngSnapshot(import.meta.path)
      }
      const document =
        format === "glb"
          ? JSON.parse(
              exported.subarray(20, 20 + exported.readUInt32LE(12)).toString(),
            )
          : JSON.parse(exported.toString())
      // A valid GLB header also passes when the model is silently dropped.
      // The fixture STEP contains thousands of vertices, unlike a fallback box.
      const modelNodes = document.nodes.filter(
        (node: { name?: string }) => node.name === "SW1",
      )
      expect({
        format,
        modelNodes: modelNodes.map((node: { name: string; mesh?: number }) => ({
          name: node.name,
          vertexCount:
            typeof node.mesh === "number"
              ? document.meshes[node.mesh].primitives.reduce(
                  (
                    count: number,
                    primitive: { attributes: { POSITION: number } },
                  ) =>
                    count +
                    document.accessors[primitive.attributes.POSITION].count,
                  0,
                )
              : 0,
        })),
      }).toMatchSnapshot()
      expect(exitCode).toBe(0)
      expect(`${stdout}\n${stderr}`).not.toContain("Failed to load")
      expect(modelNodes.length).toBeGreaterThan(0)
      expect(
        document.meshes[modelNodes[0].mesh].primitives.reduce(
          (count: number, primitive: { attributes: { POSITION: number } }) =>
            count + document.accessors[primitive.attributes.POSITION].count,
          0,
        ),
      ).toBeGreaterThan(1000)
    }
  },
  { timeout: 60_000 },
)
