import { expect, test } from "bun:test"
import { DevServer } from "cli/dev/DevServer"
import getPort from "get-port"
import fs from "node:fs"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

async function waitForFile(
  filePath: string,
  timeout = 5000,
  interval = 500,
): Promise<boolean> {
  const endTime = Date.now() + timeout
  while (Date.now() < endTime) {
    if (fs.existsSync(filePath)) {
      return true
    }
    await new Promise((resolve) => setTimeout(resolve, interval))
  }
  return false
}

test("types are installed and refreshed when files change", async () => {
  const fixture = await getCliTestFixture()

  // Get a unique port for the DevServer
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

  // Wait for the initial type file to be installed
  const typePath = path.join(
    fixture.tmpDir,
    "node_modules/@tsci/seveibar.red-led/index.d.ts",
  )
  const typeFileExists = await waitForFile(typePath)
  expect(typeFileExists).toBe(true)

  // Simulate file change with new import
  const updatedContent = `
  import { useUsbC } from "@tsci/seveibar.smd-usb-c"
  export const MyCircuit = () => <></>
  `
  fs.writeFileSync(path.join(fixture.tmpDir, "snippet.tsx"), updatedContent)

  // Wait for the new type file to be installed after update
  const typePath2 = path.join(
    fixture.tmpDir,
    "node_modules/@tsci/seveibar.smd-usb-c/index.d.ts",
  )
  const typeFileExists2 = await waitForFile(typePath2)
  expect(typeFileExists2).toBe(true)

  // Stop the dev server after the test
  await devServer.stop()
}, 10_000)
