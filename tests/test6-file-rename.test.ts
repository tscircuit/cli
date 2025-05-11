import { afterEach, expect, test } from "bun:test"
import { DevServer } from "cli/dev/DevServer"
import getPort from "get-port"
import { join } from "node:path"
import { getCliTestFixture } from "./fixtures/get-cli-test-fixture"
import { rename } from "node:fs/promises"
import fs from "fs"

test("test6 file renaming should be properly detected", async () => {
  const fixture = await getCliTestFixture()

  // Create initial files
  const notreferencedPath = join(fixture.tmpDir, "notreferenced.tsx")
  const indexPath = join(fixture.tmpDir, "index.tsx")
  const something2Path = join(fixture.tmpDir, "something2.tsx")

  console.log("Writing notreferenced.tsx...")
  await Bun.write(
    notreferencedPath,
    `
    export const MyComponent = () => (
      <div>Test Component</div>
    )
    `,
  )

  console.log("Writing index.tsx...")
  await Bun.write(
    indexPath,
    `
    import { MyComponent } from "./something2.tsx"
    
    export const MyCircuit = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
    `,
  )

  // Get a unique port for the DevServer
  const devServerPort = await getPort()

  // Create and start the DevServer
  console.log("Starting DevServer...")
  const devServer = new DevServer({
    port: devServerPort,
    componentFilePath: indexPath,
  })

  await devServer.start()
  console.log("DevServer started.")

  // Verify initial file list
  const initialFileList = await devServer.fsKy.get("api/files/list").json()
  console.log(
    "Initial file list:",
    initialFileList.file_list.map((f) => f.file_path),
  )
  expect(
    initialFileList.file_list.map((f) => f.file_path).sort(),
  ).toContainValues(["/index.tsx", "/notreferenced.tsx"])

  // Rename the file
  console.log("Renaming notreferenced.tsx to something2.tsx...")
  await rename(notreferencedPath, something2Path)

  // Wait for the file list to be updated
  let fileList: string[] = []
  let retries = 0
  const maxRetries = 10
  const retryDelay = 300

  while (retries < maxRetries) {
    const response = await fetch(
      `http://localhost:${devServerPort}/api/files/list`,
    )
    const data = await response.json()
    fileList = data.file_list.map((f: any) => f.file_path)
    console.log("Updated file list:", fileList)

    if (
      !fileList.includes("/notreferenced.tsx") &&
      fileList.includes("/something2.tsx")
    ) {
      break
    }

    await new Promise((resolve) => setTimeout(resolve, retryDelay))
    retries++
  }

  if (retries === maxRetries) {
    throw new Error("File rename was not detected within the expected time")
  }

  // Verify the file list is correct
  expect(fileList).not.toContain("/notreferenced.tsx")
  expect(fileList).toContain("/something2.tsx")

  // Verify that index.tsx still exists
  const indexPathExists = fs.existsSync(indexPath)
  console.log("index.tsx exists:", indexPathExists)
  expect(indexPathExists).toBe(true)

  afterEach(async () => {
    devServer.stop()
  })
})
