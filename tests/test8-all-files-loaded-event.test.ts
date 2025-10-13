import { expect, test } from "bun:test"
import { DevServer } from "cli/dev/DevServer"
import getPort from "get-port"
import { join } from "node:path"
import { getCliTestFixture } from "./fixtures/get-cli-test-fixture"

test("test8 all files loaded event is emitted", async () => {
  const fixture = await getCliTestFixture()

  // Create test files
  Bun.write(
    join(fixture.tmpDir, "snippet.tsx"),
    `
    export const MyCircuit = () => (
      <board width="10mm" height="10mm">
        <chip name="U1" footprint="soic8" />
      </board>
    )
    `,
  )

  Bun.write(join(fixture.tmpDir, "manual-edits.json"), "{}")

  // Get a unique port for the DevServer to avoid conflicts
  const devServerPort = await getPort()

  // Create the DevServer
  const devServer = new DevServer({
    port: devServerPort,
    componentFilePath: join(fixture.tmpDir, "snippet.tsx"),
  })

  await devServer.start()

  // Wait a bit for the event to be processed
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Check if the ALL_FILES_LOADED event was created in the file server
  const { event_list } = await devServer.fsKy.get("api/events/list").json()
  const allFilesLoadedEvents = event_list.filter(
    (event) => event.event_type === "ALL_FILES_LOADED",
  )

  // Verify that the ALL_FILES_LOADED event was emitted
  expect(allFilesLoadedEvents.length).toBeGreaterThan(0)

  // Verify that the event has the correct structure
  const event = allFilesLoadedEvents[0]
  expect(event.event_type).toBe("ALL_FILES_LOADED")
  expect(event.event_id).toBeDefined()
  expect(event.created_at).toBeDefined()

  globalThis.deferredCleanupFns.push(async () => {
    await devServer.stop()
  })
})
