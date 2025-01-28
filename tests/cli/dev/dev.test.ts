import { test, expect, afterEach, beforeEach, mock } from "bun:test"
import { DevServer } from "cli/dev/DevServer"
import { getTestFixture } from "tests/fixtures/get-test-fixture"
import fs from "node:fs"
import path from "node:path"

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
  await devServer.handleFileChangedOnFilesystem(`${tempDirPath}/snippet.tsx`)

  // Verify initial type installation
  const typePath = path.join(
    tempDirPath,
    "node_modules/@tsci/seveibar.red-led/index.d.ts",
  )
  expect(fs.existsSync(typePath)).toBe(true)

  // Simulate file change with new import
  const updatedContent = `
  import { useUsbC } from "@tsci/seveibar.smd-usb-c"
  export const MyCircuit = () => <></>
  `
  fs.writeFileSync(`${tempDirPath}/snippet.tsx`, updatedContent)

  // Trigger file change handler
  await devServer.handleFileChangedOnFilesystem(`${tempDirPath}/snippet.tsx`)

  // Verify new types file still exists after update
  const typePath2 = path.join(
    tempDirPath,
    "node_modules/@tsci/seveibar.smd-usb-c/index.d.ts",
  )
  expect(fs.existsSync(typePath2)).toBe(true)

  afterEach(async () => {
    await devServer.stop()
  })
}, 10_000)
