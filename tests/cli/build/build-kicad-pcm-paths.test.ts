import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import { test, expect } from "bun:test"
import { writeFile, readdir, mkdir, readFile, copyFile } from "node:fs/promises"
import path from "node:path"
import fs from "node:fs"
import JSZip from "jszip"

// Path to test STEP file
const STEP_FILE_PATH = path.resolve(
  __dirname,
  "../assets/SW_Push_1P1T_NO_CK_KMR2.step",
)

/**
 * Tests that --kicad-pcm generates PCM-compatible output:
 * - Symbol footprint references are prefixed with "PCM_"
 * - 3D model paths use ${KICAD_3RD_PARTY} variable
 */
test("build --kicad-pcm generates PCM-compatible paths and references", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()

  await mkdir(path.join(tmpDir, "lib"), { recursive: true })
  await mkdir(path.join(tmpDir, "assets"), { recursive: true })

  // Copy STEP file to test directory
  await copyFile(STEP_FILE_PATH, path.join(tmpDir, "assets", "test_model.step"))

  // Component with custom footprint and 3D model
  const componentCode = `
import path from "node:path"

const stepFilePath = path.resolve(__dirname, "../assets/test_model.step")

export const MySwitch = () => (
  <chip
    name="SW1"
    footprint={
      <footprint>
        <smtpad
          shape="rect"
          width="2mm"
          height="1mm"
          portHints={["pin1"]}
          pcbX={-2}
          pcbY={0}
        />
        <smtpad
          shape="rect"
          width="2mm"
          height="1mm"
          portHints={["pin2"]}
          pcbX={2}
          pcbY={0}
        />
      </footprint>
    }
    cadModel={
      <cadmodel
        modelUrl={stepFilePath}
        rotationOffset={{ x: 0, y: 0, z: 0 }}
      />
    }
    pinLabels={{ pin1: "1", pin2: "2" }}
  />
)
`

  await writeFile(path.join(tmpDir, "lib", "index.tsx"), componentCode)

  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({
      mainEntrypoint: "./lib/index.tsx",
    }),
  )

  await writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({
      name: "@tsci/testauthor.my-switch-lib",
      version: "1.0.0",
      description: "A test switch component",
      type: "module",
      dependencies: {
        react: "^19.1.0",
      },
    }),
  )

  await runCommand("tsci install")

  const { stdout } = await runCommand("tsci build --kicad-pcm")

  expect(stdout).toContain("Converting to KiCad library for PCM")
  expect(stdout).toContain("KiCad PCM assets generated")

  const kicadLibDir = path.join(tmpDir, "dist", "kicad-library")

  // Read the user symbol library content
  const userSymbolContent = await readFile(
    path.join(kicadLibDir, "symbols", "my-switch-lib.kicad_sym"),
    "utf-8",
  )

  // Verify symbol has PCM_ prefix in footprint reference
  expect(userSymbolContent).toContain("PCM_my-switch-lib:MySwitch")
  
  const userFootprintContent = await readFile(
    path.join(
      kicadLibDir,
      "footprints",
      "my-switch-lib.pretty",
      "MySwitch.kicad_mod",
    ),
    "utf-8",
  )

  // Verify 3D model path uses ${KICAD_3RD_PARTY} variable for PCM
  // Format: ${KICAD_3RD_PARTY}/3dmodels/<kicadPcmPackageId>/<library>.3dshapes/<model>.step
  expect(userFootprintContent).toContain("${KICAD_3RD_PARTY}/3dmodels/com_tscircuit_testauthor_my-switch-lib/my-switch-lib.3dshapes/test_model.step")

  // Verify the ZIP package contains correct content
  const pcmDir = path.join(tmpDir, "dist", "pcm")
  const files = await readdir(pcmDir)
  const zipFile = files.find((f) => f.endsWith(".zip"))

  // ZIP should be named: com.tscircuit.<author>.<package>-<version>.zip
  expect(zipFile).toBe("com.tscircuit.testauthor.my-switch-lib-1.0.0.zip")

  const zipBuffer = await readFile(path.join(pcmDir, zipFile!))
  const zip = await JSZip.loadAsync(zipBuffer)

  // Verify ZIP contains the symbol with PCM_ prefix
  const zipSymbolContent = await zip.files["symbols/my-switch-lib.kicad_sym"].async("string")
  expect(zipSymbolContent).toContain("PCM_my-switch-lib:MySwitch")

  // Verify ZIP contains the footprint with ${KICAD_3RD_PARTY} path
  const zipFootprintContent = await zip.files["footprints/my-switch-lib.pretty/MySwitch.kicad_mod"].async("string")
  expect(zipFootprintContent).toMatchInlineSnapshot(`
    "(footprint
      "MySwitch"
      (layer F.Cu)
      (at 0 0 0)
      (descr "")
      (tags "")
      (attr smd)
      (embedded_fonts no)
      (property "Reference" "Ref**"
        (at 0 0 0)
        (layer F.SilkS)
        (uuid 521fe180-3a89-2d01-38cd-c47e53db4a03)
        (effects
          (font
            (size 1.27 1.27)
            (thickness 0.15)
          )
        )
      )
      (property "Value" "Val**"
        (at 0 0 0)
        (layer F.Fab)
        (uuid 59786640-408c-b2ff-256e-33c27496e57d)
        (effects
          (font
            (size 1.27 1.27)
            (thickness 0.15)
          )
        )
      )
      (property "Datasheet" ""
        (at 0 0 0)
        (layer F.Fab)
        (hide yes)
        (uuid 6b33c240-2175-4c41-51e1-a53e3ac76943)
        (effects
          (font
            (size 1.27 1.27)
            (thickness 0.15)
          )
        )
      )
      (property "Description" ""
        (at 0 0 0)
        (layer F.Fab)
        (hide yes)
        (uuid 06594860-0cf8-b6c1-1398-25221a379383)
        (effects
          (font
            (size 1.27 1.27)
            (thickness 0.15)
          )
        )
      )
      (pad "1" smd rect
        (at -2 0 0)
        (size 2 1)
        (layers F.Cu F.Paste F.Mask)
        (uuid 633a4dec-1f37-b14c-24ca-eb5468cd87f4)
      )
      (pad "2" smd rect
        (at 2 0 0)
        (size 2 1)
        (layers F.Cu F.Paste F.Mask)
        (uuid 07e0ff52-4be3-9bf2-7019-c76e2c172ace)
      )
      (model "\${KICAD_3RD_PARTY}/3dmodels/com_tscircuit_testauthor_my-switch-lib/my-switch-lib.3dshapes/test_model.step"
        (offset
          (xyz 0 0 0)
        )
        (rotate
          (xyz 0 0 0)
        )
      )
    )"
  `)
}, 120_000)
