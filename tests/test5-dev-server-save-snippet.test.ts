import { test, expect, afterEach, afterAll } from "bun:test"
import { DevServer } from "cli/dev/DevServer"
import { getTestFixture } from "tests/fixtures/get-test-fixture"
import { EventsWatcher } from "lib/server/EventsWatcher"
import { getTestSnippetsServer } from "./fixtures/get-test-server"
import { cliConfig } from "lib/cli-config"

test("test saveSnippet via REQUEST_TO_SAVE_SNIPPET event with CLI token setup", async () => {
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
  await eventManager.start().then(() => {
    // Emit the REQUEST_TO_SAVE_SNIPPET event
    devServer.fsKy.post("api/events/create", {
      json: { event_type: "REQUEST_TO_SAVE_SNIPPET" },
    })
  })

  // Promises to wait for specific events
  const requestToSaveSnippetPromise = new Promise<void>((resolve) => {
    eventManager.on("REQUEST_TO_SAVE_SNIPPET", async () => {
      resolve()
    })
  })

  const sessionToken = cliConfig.get("sessionToken")
  cliConfig.delete("sessionToken")

  const snippetSavedPromise = new Promise<void>((resolve) => {
    eventManager.on("SNIPPET_SAVED", () => {
      resolve()
    })
  })

  const snippetSaveFailedPromise = new Promise<void>((resolve) => {
    eventManager.on("FAILED_TO_SAVE_SNIPPET", () => {
      resolve()
      cliConfig.set("sessionToken", sessionToken)
      devServer.fsKy.post("api/events/create", {
        json: { event_type: "REQUEST_TO_SAVE_SNIPPET" },
      })
    })
  })

  await Bun.sleep(4000)
  // Wait for the REQUEST_TO_SAVE_SNIPPET event to be detected
  expect(requestToSaveSnippetPromise).resolves.toBeUndefined()

  // Wait for the FAILED_TO_SAVE_SNIPPET event to be detected
  expect(snippetSaveFailedPromise).resolves.toBeUndefined()

  // Wait for the SNIPPET_SAVED event to be detected
  expect(snippetSavedPromise).resolves.toBeUndefined()

  afterAll(() => {
    eventManager.stop()
    devServer.stop()
  })
}, 20_000)
