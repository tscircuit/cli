import { test, expect, afterAll } from "bun:test"
import { DevServer } from "cli/dev/DevServer"
import { getTestFixture } from "tests/fixtures/get-test-fixture"
import { EventsWatcher } from "lib/server/EventsWatcher"
import { getTestSnippetsServer } from "./fixtures/get-test-server"
import { cliConfig } from "lib/cli-config"

const dummyJwtToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ." +
  "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"

test("test saveSnippet via REQUEST_TO_SAVE_SNIPPET event with CLI token setup", async () => {
  afterAll(() => {
    eventManager.stop()
    devServer.stop()
  })

  // Start snippets server
  await getTestSnippetsServer()

  // Set up a temporary directory with a sample snippet file
  const { tempDirPath, devServerPort, devServerUrl } = await getTestFixture({
    vfs: {
      "snippet.tsx": `
          export const MyCircuit = () => (
            <board width="10mm" height="10mm">
              <chip name="U1" footprint="soic8" />
            </board>
          )
        `,
      "manual-edits.json": "{}",
      "package.json": JSON.stringify({
        version: "0.0.1",
        name: "snippet",
        author: "test-author",
      }),
    },
  })

  // Create and start the DevServer instance
  const devServer = new DevServer({
    port: devServerPort,
    componentFilePath: `${tempDirPath}/snippet.tsx`,
  })
  await devServer.start()

  // Start the EventsWatcher to listen for events
  const eventManager = new EventsWatcher(devServerUrl)
  await eventManager.start()

  // Emit the REQUEST_TO_SAVE_SNIPPET event
  devServer.fsKy.post("api/events/create", {
    json: { event_type: "REQUEST_TO_SAVE_SNIPPET" },
  })

  // Promises to wait for specific events using Promise.withResolvers()
  const {
    promise: requestToSaveSnippetPromise,
    resolve: resolveRequestToSaveSnippet,
  } = Promise.withResolvers<void>()
  eventManager.on("REQUEST_TO_SAVE_SNIPPET", async () => {
    resolveRequestToSaveSnippet()
  })

  cliConfig.set("sessionToken", dummyJwtToken)
  const sessionToken = cliConfig.get("sessionToken")
  cliConfig.delete("sessionToken")

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
    cliConfig.set("sessionToken", sessionToken)
    devServer.fsKy.post("api/events/create", {
      json: { event_type: "REQUEST_TO_SAVE_SNIPPET" },
    })
  })

  // Wait for the REQUEST_TO_SAVE_SNIPPET event to be detected
  expect(requestToSaveSnippetPromise).resolves.toBeUndefined()

  // Wait for the FAILED_TO_SAVE_SNIPPET event to be detected
  expect(snippetSaveFailedPromise).resolves.toBeUndefined()

  // Wait for the SNIPPET_SAVED event to be detected
  expect(snippetSavedPromise).resolves.toBeUndefined()

  
}, 20_000)
