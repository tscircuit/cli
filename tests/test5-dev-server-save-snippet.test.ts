import { afterAll, expect, test } from "bun:test"
import { cliConfig } from "lib/cli-config"
import { DevServer } from "cli/dev/DevServer"
import getPort from "get-port"
import { EventsWatcher } from "lib/server/EventsWatcher"
import { join } from "node:path"
import { getCliTestFixture } from "./fixtures/get-cli-test-fixture"

test("test saveSnippet via REQUEST_TO_SAVE_SNIPPET event with CLI token setup", async () => {
  // Get the CLI test fixture with fake API server
  const fixture = await getCliTestFixture()

  // Get a separate port for the DevServer
  const devServerPort = await getPort()

  // Create test files in the temporary directory
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

  Bun.write(
    join(fixture.tmpDir, "package.json"),
    JSON.stringify({
      version: "0.0.1",
      name: "snippet",
      author: "test-author",
    }),
  )

  // Create and start the DevServer instance using a different port
  const devServer = new DevServer({
    port: devServerPort, // Use separate port for DevServer
    componentFilePath: join(fixture.tmpDir, "snippet.tsx"),
  })
  await devServer.start()

  // Create DevServer URL for the EventsWatcher
  const devServerUrl = `http://localhost:${devServerPort}`

  // Start the EventsWatcher using DevServer URL
  const eventManager = new EventsWatcher(devServerUrl)
  await eventManager.start()

  afterAll(() => {
    eventManager.stop()
    devServer.stop()
  })

  // Test the save snippet flow without auth token
  const originalToken = cliConfig.get("sessionToken")
  cliConfig.delete("sessionToken") // Remove auth token temporarily

  // Emit the REQUEST_TO_SAVE_SNIPPET event
  devServer.fsKy.post("api/events/create", {
    json: { event_type: "REQUEST_TO_SAVE_SNIPPET" },
  })

  // Set up event promises
  const {
    promise: requestToSaveSnippetPromise,
    resolve: resolveRequestToSaveSnippet,
  } = Promise.withResolvers<void>()
  eventManager.on("REQUEST_TO_SAVE_SNIPPET", async () => {
    resolveRequestToSaveSnippet()
  })

  const { promise: snippetSavedPromise, resolve: resolveSnippetSaved } =
    Promise.withResolvers<void>()
  eventManager.on("SNIPPET_SAVED", () => {
    resolveSnippetSaved()
  })

  const {
    promise: snippetSaveFailedPromise,
    resolve: resolveSnippetSaveFailed,
  } = Promise.withResolvers<void>()
  eventManager.on("FAILED_TO_SAVE_SNIPPET", () => {
    resolveSnippetSaveFailed()
    // Restore auth token and try again
    cliConfig.set("sessionToken", originalToken)
    devServer.fsKy.post("api/events/create", {
      json: { event_type: "REQUEST_TO_SAVE_SNIPPET" },
    })
  })

  // Wait for events and verify the flow
  expect(requestToSaveSnippetPromise).resolves.toBeUndefined()
  expect(snippetSaveFailedPromise).resolves.toBeUndefined()
  expect(snippetSavedPromise).resolves.toBeUndefined()
}, 20_000)
