import { test, expect, afterEach } from "bun:test"
import { DevServer } from "cli/dev/DevServer"
import { getTestFixture } from "tests/fixtures/get-test-fixture"
import fs from "node:fs"
import path from "node:path"

async function waitForFile(
  filePath: string,
  timeout: number = 5000,
  interval: number = 500,
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
  const { tempDirPath, devServerPort } = await getTestFixture({
    vfs: {
      "snippet.tsx": `
        import { useRedLed } from "@tsci/seveibar.red-led"
        export const MyCircuit = () => <></>
      `,
      "package.json": "{}",
    },
  })

  const devServer = new DevServer({
    port: devServerPort,
    componentFilePath: `${tempDirPath}/snippet.tsx`,
  })

  await devServer.start()

  // Wait for the initial type file to be installed
  const typePath = path.join(
    tempDirPath,
    "node_modules/@tsci/seveibar.red-led/index.d.ts",
  )
  const typeFileExists = await waitForFile(typePath)
  expect(typeFileExists).toBe(true)

  // Simulate file change with new import
  const updatedContent = `
  import { useUsbC } from "@tsci/seveibar.smd-usb-c"
  export const MyCircuit = () => <></>
  `
  fs.writeFileSync(`${tempDirPath}/snippet.tsx`, updatedContent)

  // Wait for the new type file to be installed after update
  const typePath2 = path.join(
    tempDirPath,
    "node_modules/@tsci/seveibar.smd-usb-c/index.d.ts",
  )
  const typeFileExists2 = await waitForFile(typePath2)
  expect(typeFileExists2).toBe(true)

  // Stop the dev server after the test
  await devServer.stop()
}, 10_000)
