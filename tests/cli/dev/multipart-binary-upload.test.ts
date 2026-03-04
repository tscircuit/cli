import { expect, test } from "bun:test"
import { join } from "node:path"
import { DevServer } from "cli/dev/DevServer"
import getPort from "get-port"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("multipart endpoint upserts binary files", async () => {
  const fixture = await getCliTestFixture()
  const devServerPort = await getPort()

  const mainFilePath = join(fixture.tmpDir, "main.tsx")
  await Bun.write(
    mainFilePath,
    `export default () => <board width=\"10mm\" height=\"10mm\" />`,
  )

  const devServer = new DevServer({
    port: devServerPort,
    componentFilePath: mainFilePath,
  })

  try {
    await devServer.start()

    const binaryContent = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d])
    const formData = new FormData()
    formData.set("file_path", "uploaded.png")
    formData.set("binary_file", new Blob([binaryContent]), "uploaded.png")

    const response = await fetch(
      `http://localhost:${devServerPort}/api/files/upsert-multipart`,
      {
        method: "POST",
        body: formData,
      },
    )

    expect(response.ok).toBe(true)

    const { file } = await devServer.fsKy
      .get("api/files/get", {
        searchParams: { file_path: "uploaded.png" },
      })
      .json()

    expect(file.binary_content_b64).toBe(
      Buffer.from(binaryContent).toString("base64"),
    )
    expect(file.text_content).toBeUndefined()
  } finally {
    await devServer.stop()
  }
})
