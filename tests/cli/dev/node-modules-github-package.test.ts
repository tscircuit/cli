import { test, expect } from "bun:test"
import { DevServer } from "../../../cli/dev/DevServer"
import * as path from "node:path"
import * as fs from "node:fs"
import * as os from "node:os"
import ky from "ky"
import getPort from "get-port"

/**
 * This test reproduces a bug where packages installed from GitHub URLs
 * (e.g., `tsci install https://github.com/espressif/kicad-libraries`)
 * don't have their files uploaded to the dev server.
 *
 * The issue is that when a KiCad library is installed from GitHub, the repository
 * typically does NOT have a package.json file (it's a KiCad library, not an npm package).
 * This causes the CLI to fail to:
 * 1. Recognize the package as needing to be uploaded
 * 2. Collect files from the package directory
 *
 * This causes imports like:
 *   import kicadMod from "kicad-libraries/footprints/Espressif.pretty/ESP32-S2-MINI-1.kicad_mod"
 * to fail with:
 *   "Node module has no files in the node_modules directory"
 */

/**
 * BUG REPRODUCTION TEST
 *
 * This test reproduces the actual bug: when a KiCad library is installed from GitHub,
 * the repository does NOT have a package.json file. The CLI fails to upload the files
 * because resolveNodeModuleImport() returns empty when there's no package.json.
 */
test(
  "BUG: DevServer fails to upload GitHub packages WITHOUT package.json (like real kicad-libraries)",
  async () => {
    // Create a temporary directory for testing
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "tsci-test-github-no-pkgjson-"),
    )

    try {
      // Create package.json with a GitHub URL dependency
      fs.writeFileSync(
        path.join(tmpDir, "package.json"),
        JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          dependencies: {
            "kicad-libraries": "https://github.com/espressif/kicad-libraries",
          },
        }),
      )

      // Create node_modules structure WITHOUT package.json in the kicad-libraries folder
      // This matches the real kicad-libraries repo structure
      const nodeModulesDir = path.join(tmpDir, "node_modules")
      const kicadLibDir = path.join(nodeModulesDir, "kicad-libraries")
      const footprintsDir = path.join(
        kicadLibDir,
        "footprints",
        "Espressif.pretty",
      )
      fs.mkdirSync(footprintsDir, { recursive: true })

      // NO package.json in kicad-libraries - this is the bug!
      // Real kicad-libraries repo doesn't have package.json

      // Create a .kicad_mod file
      const kicadModContent = `(module ESP32-S2-MINI-1 (layer F.Cu)
  (fp_text reference REF** (at 0 -1) (layer F.SilkS))
  (fp_text value ESP32-S2-MINI-1 (at 0 1) (layer F.Fab))
  (pad 1 smd rect (at -7.5 -4.5) (size 0.9 0.5) (layers F.Cu F.Paste F.Mask))
)`
      fs.writeFileSync(
        path.join(footprintsDir, "ESP32-S2-MINI-1.kicad_mod"),
        kicadModContent,
      )

      // Create a component that imports from the kicad-libraries package
      const componentPath = path.join(tmpDir, "index.tsx")
      fs.writeFileSync(
        componentPath,
        `import kicadMod from "kicad-libraries/footprints/Espressif.pretty/ESP32-S2-MINI-1.kicad_mod"

export default () => {
  return (
    <board width="20mm" height="20mm">
      <chip footprint={kicadMod} name="U1" />
    </board>
  )
}`,
      )

      // Start the dev server
      const port = await getPort()
      const devServer = new DevServer({
        port,
        componentFilePath: componentPath,
        projectDir: tmpDir,
      })

      await devServer.start()

      // Wait for files to upload
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Check if node_modules files were uploaded
      const fsKy = ky.create({ prefixUrl: `http://localhost:${port}` }) as any

      const fileListResponse = await fsKy.get("api/files/list").json()
      const fileList = fileListResponse.file_list as Array<{
        file_id: string
        file_path: string
      }>

      // Debug: print all uploaded files
      console.log(
        "Uploaded files:",
        fileList.map((f) => f.file_path),
      )

      // BUG: The .kicad_mod file should be uploaded but it's NOT because
      // there's no package.json in the kicad-libraries folder
      const esp32S2ModFile = fileList.find((f) =>
        f.file_path.includes(
          "node_modules/kicad-libraries/footprints/Espressif.pretty/ESP32-S2-MINI-1.kicad_mod",
        ),
      )

      console.log("esp32S2ModFile:", esp32S2ModFile)

      // This assertion currently FAILS - proving the bug exists
      expect(esp32S2ModFile).toBeDefined()

      await devServer.stop()
    } finally {
      // Cleanup
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  },
  { timeout: 10_000 },
)
