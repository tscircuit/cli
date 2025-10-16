import { expect, test } from "bun:test"
import { DevServer } from "cli/dev/DevServer"
import getPort from "get-port"
import { join } from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test(
  "dev-server handles delayed initial file uploads",
  async () => {
    const fixture = await getCliTestFixture()
    const devServerPort = await getPort()

    const mainTsxContent = `
        import { partName } from "./util.ts"
        export default () => (
          <board>
            <resistor name={partName} resistance="1k" footprint="0402" />
          </board>
        )
    `
    const utilTsContent = `export const partName = "R1"`

    // We start the dev server with an empty project and manually control file uploads
    // to simulate a delay, much like example33-delay-file-uploads-repro.fixture.tsx
    const devServer = new DevServer({
      port: devServerPort,
      componentFilePath: join(fixture.tmpDir, "main.tsx"),
      projectDir: fixture.tmpDir,
    })

    // Prevent automatic initial file upload
    devServer.upsertInitialFiles = async () => {}

    await devServer.start()

    // Clean up any files from previous tests
    const initialFiles = (await devServer.fsKy
      .get("api/files/list")
      .json()) as any
    for (const file of initialFiles.file_list) {
      await devServer.fsKy.post("api/files/delete", {
        json: { file_path: file.file_path },
        throwHttpErrors: false,
      })
    }

    // 1. Reset events
    await devServer.fsKy.post("api/events/reset", { json: {} })

    // 2. Upload main.tsx first
    await devServer.fsKy.post("api/files/upsert", {
      json: {
        file_path: "main.tsx",
        text_content: mainTsxContent,
      },
    })

    // 3. Verify only main.tsx is present
    let fileListRes = (await devServer.fsKy.get("api/files/list").json()) as any
    expect(fileListRes.file_list.length).toBe(1)
    expect(fileListRes.file_list[0].file_path).toBe("main.tsx")

    // 4. Introduce a delay
    await new Promise((r) => setTimeout(r, 200))

    // 5. Upload util.ts after the delay
    await devServer.fsKy.post("api/files/upsert", {
      json: {
        file_path: "util.ts",
        text_content: utilTsContent,
      },
    })

    // 6. Verify both files are now present
    fileListRes = (await devServer.fsKy.get("api/files/list").json()) as any
    expect(fileListRes.file_list.length).toBe(2)
    expect(fileListRes.file_list.map((f: any) => f.file_path)).toContainValues([
      "main.tsx",
      "util.ts",
    ])

    // 7. Signal that initial files are loaded
    await devServer.fsKy.post("api/events/create", {
      json: {
        event_type: "INITIAL_FILES_UPLOADED",
        file_count: 2,
      },
    })

    // 8. Check that the event was created
    const eventsRes = (await devServer.fsKy
      .get("api/events/list")
      .json()) as any
    const initialFilesUploadedEvent = eventsRes.event_list.find(
      (e: any) => e.event_type === "INITIAL_FILES_UPLOADED",
    )
    expect(initialFilesUploadedEvent).toBeDefined()
    expect(initialFilesUploadedEvent.file_count).toBe(2)

    await devServer.stop()
  },
  { timeout: 10_000 },
)
