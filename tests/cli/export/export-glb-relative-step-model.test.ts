import { expect, test } from "bun:test"
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { convertModelUrlsToFileUrls } from "../../../cli/build/convert-model-urls-to-file-urls"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

interface ExportedGltfScene {
  nodes?: { name?: string; mesh?: number }[]
  meshes?: { primitives: { attributes: { POSITION: number } }[] }[]
  accessors?: { count: number }[]
}

function parseGlbJsonChunk(glbBuffer: Buffer): ExportedGltfScene {
  expect(glbBuffer.subarray(0, 4).toString("utf-8")).toBe("glTF")
  const jsonChunkLength = glbBuffer.readUInt32LE(12)
  const jsonChunkType = glbBuffer.readUInt32LE(16)
  expect(jsonChunkType).toBe(0x4e4f534a) // "JSON"
  return JSON.parse(
    glbBuffer.subarray(20, 20 + jsonChunkLength).toString("utf-8"),
  ) as ExportedGltfScene
}

function getMeshVertexCount(scene: ExportedGltfScene, meshIndex?: number) {
  if (meshIndex === undefined || !scene.meshes || !scene.accessors) return 0
  const mesh = scene.meshes[meshIndex]
  if (!mesh) return 0
  return mesh.primitives.reduce(
    (sum, primitive) =>
      sum + (scene.accessors?.[primitive.attributes.POSITION]?.count ?? 0),
    0,
  )
}

test("convertModelUrlsToFileUrls resolves relative local model paths against baseDirectory", () => {
  const baseDir = path.resolve("/tmp/project-subdir")
  const converted = convertModelUrlsToFileUrls(
    [
      {
        type: "cad_component",
        cad_component_id: "cad_1",
        pcb_component_id: "pcb_1",
        source_component_id: "src_1",
        position: { x: 0, y: 0, z: 0 },
        model_step_url: "./libraries/cap.step",
        model_glb_url: "libraries/chip.glb",
        model_stl_url: "https://example.com/remote.stl",
        model_obj_url: "/opt/models/part.obj",
      } as any,
    ],
    baseDir,
  ) as any[]

  expect(converted[0].model_step_url).toBe(
    pathToFileURL(path.join(baseDir, "libraries", "cap.step")).href,
  )
  expect(converted[0].model_glb_url).toBe(
    pathToFileURL(path.join(baseDir, "libraries", "chip.glb")).href,
  )
  expect(converted[0].model_stl_url).toBe("https://example.com/remote.stl")
  expect(converted[0].model_obj_url).toBe(
    pathToFileURL("/opt/models/part.obj").href,
  )
})

test(
  "tsci export -f glb and -f gltf load relative cadModel stepUrl from project directory",
  async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    const projectDir = path.join(tmpDir, "nested-project")
    const librariesDir = path.join(projectDir, "libraries")
    await mkdir(librariesDir, { recursive: true })

    await copyFile(
      path.join(import.meta.dir, "../assets/SW_Push_1P1T_NO_CK_KMR2.step"),
      path.join(librariesDir, "cap.step"),
    )

    const circuitPath = path.join(projectDir, "index.tsx")
    await writeFile(
      circuitPath,
      `export default () => (
  <board width="10mm" height="10mm">
    <capacitor
      name="C1"
      capacitance="100nF"
      footprint="0402"
      cadModel={{ stepUrl: "./libraries/cap.step" }}
    />
  </board>
)
`,
    )

    for (const format of ["glb", "gltf"] as const) {
      const { stdout, stderr, exitCode } = await runCommand(
        `tsci export ${circuitPath} -f ${format}`,
      )
      expect(exitCode).toBe(0)
      expect(`${stdout}\n${stderr}`).not.toContain("Failed to load")

      const exportedBuffer = await readFile(
        path.join(projectDir, `index.${format}`),
      )
      const scene: ExportedGltfScene =
        format === "glb"
          ? parseGlbJsonChunk(exportedBuffer)
          : (JSON.parse(exportedBuffer.toString("utf-8")) as ExportedGltfScene)

      const componentNodes = (scene.nodes ?? []).filter(
        (node) => node.name === "C1" && node.mesh !== undefined,
      )
      expect(componentNodes.length).toBeGreaterThan(0)
      expect(
        getMeshVertexCount(scene, componentNodes[0]!.mesh),
      ).toBeGreaterThan(1000)
    }
  },
  { timeout: 60_000 },
)
