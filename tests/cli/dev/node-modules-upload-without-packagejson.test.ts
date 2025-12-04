import { test, expect } from "bun:test"
import { DevServer } from "../../../cli/dev/DevServer"
import * as path from "node:path"
import * as fs from "node:fs"
import * as os from "node:os"
import ky from "ky"

test(
  "DevServer uploads only the specific imported file from packages without package.json (e.g., KiCad libraries)",
  async () => {
    // Create a temporary directory for testing
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "tsci-test-no-pkgjson-"),
    )

    try {
      // Create a simple package.json with a GitHub-installed package (simulated)
      fs.writeFileSync(
        path.join(tmpDir, "package.json"),
        JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          dependencies: {
            "kicad-libraries": "github:espressif/kicad-libraries",
          },
        }),
      )

      // Create node_modules with a KiCad library structure (no package.json!)
      const nodeModulesDir = path.join(tmpDir, "node_modules")
      const kicadDir = path.join(nodeModulesDir, "kicad-libraries")
      const footprintsDir = path.join(
        kicadDir,
        "footprints",
        "Espressif.pretty",
      )
      fs.mkdirSync(footprintsDir, { recursive: true })

      // Create multiple .kicad_mod files (simulating a real KiCad library)
      fs.writeFileSync(
        path.join(footprintsDir, "ESP32-S2-MINI-1.kicad_mod"),
        "(module ESP32-S2-MINI-1 (layer F.Cu))",
      )
      fs.writeFileSync(
        path.join(footprintsDir, "ESP32-S3-WROOM-1.kicad_mod"),
        "(module ESP32-S3-WROOM-1 (layer F.Cu))",
      )
      fs.writeFileSync(
        path.join(footprintsDir, "ESP32-C3-MINI-1.kicad_mod"),
        "(module ESP32-C3-MINI-1 (layer F.Cu))",
      )

      // Create a component that imports only ONE specific .kicad_mod file
      const componentPath = path.join(tmpDir, "component.tsx")
      fs.writeFileSync(
        componentPath,
        `import kicadFootprint from "kicad-libraries/footprints/Espressif.pretty/ESP32-S2-MINI-1.kicad_mod"\n\nexport default () => <board width={10} height={10} />`,
      )

      // Start the dev server
      const port = 8767
      const devServer = new DevServer({
        port,
        componentFilePath: componentPath,
        projectDir: tmpDir,
      })

      await devServer.start()

      // Wait a bit for files to upload
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Check which files were uploaded
      const fsKy = ky.create({ prefixUrl: `http://localhost:${port}` }) as any

      const fileListResponse = await fsKy.get("api/files/list").json()
      const fileList = fileListResponse.file_list as Array<{
        file_id: string
        file_path: string
      }>

      // Get all uploaded kicad-libraries files
      const kicadFiles = fileList.filter((f) =>
        f.file_path.includes("kicad-libraries"),
      )

      console.log("files", kicadFiles)

      // Should have uploaded ONLY the specifically imported file
      expect(kicadFiles.length).toBe(1)
      expect(kicadFiles[0].file_path).toContain("ESP32-S2-MINI-1.kicad_mod")

      // Should NOT have uploaded the other .kicad_mod files
      const otherKicadFiles = fileList.filter(
        (f) =>
          f.file_path.includes("ESP32-S3-WROOM-1.kicad_mod") ||
          f.file_path.includes("ESP32-C3-MINI-1.kicad_mod"),
      )
      expect(otherKicadFiles.length).toBe(0)

      await devServer.stop()
    } finally {
      // Cleanup
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  },
  { timeout: 10_000 },
)
