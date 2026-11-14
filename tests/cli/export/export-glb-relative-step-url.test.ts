import { expect, test } from "bun:test"
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { temporaryDirectory } from "tempy"
import { convertModelUrlsToFileUrls } from "../../../cli/build/convert-model-urls-to-file-urls"
import { exportSnippet } from "../../../lib/shared/export-snippet"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const STEP_FIXTURE_PATH = path.resolve(
  import.meta.dir,
  "../assets/SW_Push_1P1T_NO_CK_KMR2.step",
)

const parseGlbSceneJson = (glbBuffer: Buffer) => {
  expect(glbBuffer.subarray(0, 4).toString("utf-8")).toBe("glTF")
  const jsonChunkLength = glbBuffer.readUInt32LE(12)
  const jsonChunkType = glbBuffer.readUInt32LE(16)
  expect(jsonChunkType).toBe(0x4e4f534a) // "JSON"
  return JSON.parse(
    glbBuffer.subarray(20, 20 + jsonChunkLength).toString("utf-8"),
  ) as {
    meshes?: Array<{ primitives: Array<{ attributes: { POSITION?: number } }> }>
    accessors?: Array<{ count: number }>
  }
}

const getTotalGlbVertices = (glbBuffer: Buffer) => {
  const scene = parseGlbSceneJson(glbBuffer)
  let vertices = 0
  for (const mesh of scene.meshes ?? []) {
    for (const primitive of mesh.primitives) {
      const posIdx = primitive.attributes.POSITION
      if (posIdx !== undefined) {
        vertices += scene.accessors?.[posIdx]?.count ?? 0
      }
    }
  }
  return vertices
}

test("convertModelUrlsToFileUrls resolves dot-relative, bare-relative, and cwd-fallback model paths", async () => {
  const rootDir = temporaryDirectory()
  const subDir = path.join(rootDir, "boards", "sensor")
  const distDir = path.join(rootDir, "dist", "index")
  const previousCwd = process.cwd()

  try {
    await mkdir(path.join(subDir, "libraries"), { recursive: true })
    await mkdir(path.join(rootDir, "shared-models"), { recursive: true })
    await mkdir(distDir, { recursive: true })

    const subStepPath = path.join(subDir, "libraries", "cap.step")
    const rootStepPath = path.join(rootDir, "shared-models", "root-cap.step")
    await writeFile(subStepPath, "ISO-10303-21;")
    await writeFile(rootStepPath, "ISO-10303-21;")

    process.chdir(rootDir)

    const dataUri = "data:model/gltf-binary;base64,AAAA"
    const remoteUrl = "https://example.com/cap.step"
    const fileUrl = "file:///opt/models/existing.glb"

    const convertedFromSubdir = convertModelUrlsToFileUrls(
      [
        {
          type: "cad_component",
          model_step_url: "./libraries/cap.step",
          step_model_url: "libraries/cap.step",
          model_glb_url: remoteUrl,
          glb_model_url: fileUrl,
          model_gltf_url: dataUri,
        },
      ],
      subDir,
    )

    expect(convertedFromSubdir[0].model_step_url).toBe(
      pathToFileURL(subStepPath).href,
    )
    expect(convertedFromSubdir[0].step_model_url).toBe(
      pathToFileURL(subStepPath).href,
    )
    expect(convertedFromSubdir[0].model_glb_url).toBe(remoteUrl)
    expect(convertedFromSubdir[0].glb_model_url).toBe(fileUrl)
    expect(convertedFromSubdir[0].model_gltf_url).toBe(dataUri)

    // Prebuilt circuit.json in dist/index referencing a project-root relative path falls back to cwd
    const convertedFromDist = convertModelUrlsToFileUrls(
      [
        {
          type: "cad_component",
          model_step_url: "./shared-models/root-cap.step",
        },
      ],
      distDir,
    )

    expect(convertedFromDist[0].model_step_url).toBe(
      pathToFileURL(rootStepPath).href,
    )
  } finally {
    process.chdir(previousCwd)
    await rm(rootDir, { recursive: true, force: true })
  }
})

test(
  "tsci export -f glb loads a relative cadModel stepUrl without 404 errors",
  async () => {
    const { tmpDir, runCommand } = await getCliTestFixture({
      skipSkillSetup: true,
    })
    const subprojectDir = path.join(tmpDir, "subproject")
    const librariesDir = path.join(subprojectDir, "libraries")
    await mkdir(librariesDir, { recursive: true })

    await copyFile(STEP_FIXTURE_PATH, path.join(librariesDir, "cap.step"))

    const circuitWithStepPath = path.join(subprojectDir, "with-step.tsx")
    await writeFile(
      circuitWithStepPath,
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

    const outputGlbPath = path.join(tmpDir, "export-with-step.glb")
    const { stderr } = await runCommand(
      `tsci export ${circuitWithStepPath} -f glb -o ${outputGlbPath}`,
    )

    expect(stderr).not.toContain("Failed to load STEP")
    expect(stderr).not.toContain("404 Not Found")

    const withStepGlb = await readFile(outputGlbPath)
    const withStepVertices = getTotalGlbVertices(withStepGlb)

    // Compare against exporting the same board without the STEP model
    const boardOnlyJsonPath = path.join(
      subprojectDir,
      "board-only.circuit.json",
    )
    await writeFile(
      boardOnlyJsonPath,
      JSON.stringify([
        {
          type: "pcb_board",
          pcb_board_id: "pcb_board_0",
          center: { x: 0, y: 0 },
          width: 10,
          height: 10,
          thickness: 1.4,
          num_layers: 2,
          material: "fr4",
        },
      ]),
    )

    let boardOnlyGlb: Buffer | undefined
    await exportSnippet({
      filePath: boardOnlyJsonPath,
      format: "glb",
      writeFile: false,
      onExit: () => {},
      onError: (msg) => {
        throw new Error(msg)
      },
      onSuccess: ({ outputContent }) => {
        boardOnlyGlb = outputContent as Buffer
      },
    })

    expect(boardOnlyGlb).toBeDefined()
    const boardOnlyVertices = getTotalGlbVertices(boardOnlyGlb!)

    expect(withStepGlb.byteLength).toBeGreaterThan(
      boardOnlyGlb!.byteLength + 10_000,
    )
    expect(withStepVertices).toBeGreaterThan(boardOnlyVertices + 100)
  },
  { timeout: 60_000 },
)
