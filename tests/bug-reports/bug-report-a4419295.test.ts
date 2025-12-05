import { expect, test } from "bun:test"
import { runBrowserTest } from "../fixtures/runBrowserTest"

/**
 * This test reproduces a bug where packages installed from GitHub URLs
 * (e.g., `tsci install https://github.com/espressif/kicad-libraries`)
 * don't have their files uploaded to the dev server.
 *
 * The issue is that when a KiCad library is installed from GitHub, the repository
 * typically does NOT have a package.json file (it's a KiCad library, not an npm package).
 * This causes the CLI to fail to upload the files because resolveNodeModuleImport()
 * returns empty when there's no package.json.
 *
 * Error seen by users:
 *   "Node module 'kicad-libraries/footprints/Espressif.pretty/ESP32-S2-MINI-1.kicad_mod'
 *    has no files in the node_modules directory"
 */
test.skip("kicad-libraries github package without package.json should have files uploaded", async () => {
  const result = await runBrowserTest({
    bugReportId: "a4419295-de4d-476f-9629-b07308b94dde",
  })

  console.log("Errors:", result.errors)
  console.log("Has execution error:", result.hasExecutionError)

  // The bug causes an execution error because kicad_mod files aren't uploaded
  // expect(result.hasExecutionError).toBe(false)
  // expect(result.errors.length).toBe(0)
}, 120_000)
