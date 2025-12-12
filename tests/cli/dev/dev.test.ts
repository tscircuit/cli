import { expect, test } from "bun:test"
import { DevServer } from "cli/dev/DevServer"
import getPort from "get-port"
import fs from "node:fs"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

/**
 * This test verifies that the dev server does NOT try to fetch types
 * for @tsci/ packages from the registry API, since types are now
 * included inside the modules themselves.
 */
test("types are NOT fetched from registry (types are bundled in modules)", async () => {
  const fixture = await getCliTestFixture()

  const devServerPort = await getPort()

  // Create test files using Bun.write
  await Bun.write(
    path.join(fixture.tmpDir, "snippet.tsx"),
    `
    import { useRedLed } from "@tsci/seveibar.red-led"
    export const MyCircuit = () => <></>
    `,
  )

  await Bun.write(path.join(fixture.tmpDir, "package.json"), "{}")

  const devServer = new DevServer({
    port: devServerPort,
    componentFilePath: path.join(fixture.tmpDir, "snippet.tsx"),
  })

  await devServer.start()

  // Verify that NO type files were fetched/created
  // (since types are now bundled in modules, not fetched from registry)
  const typePath = path.join(
    fixture.tmpDir,
    "node_modules/@tsci/seveibar.red-led/index.d.ts",
  )
  expect(fs.existsSync(typePath)).toBe(false)

  // Simulate file change with new import
  const updatedContent = `
  import { useUsbC } from "@tsci/seveibar.smd-usb-c"
  export const MyCircuit = () => <></>
  `
  fs.writeFileSync(path.join(fixture.tmpDir, "snippet.tsx"), updatedContent)

  // Verify that NO type files were fetched for the new import either
  const typePath2 = path.join(
    fixture.tmpDir,
    "node_modules/@tsci/seveibar.smd-usb-c/index.d.ts",
  )
  expect(fs.existsSync(typePath2)).toBe(false)

  await devServer.stop()
}, 10_000)
