import { expect, test } from "bun:test"
import { DevServer } from "cli/dev/DevServer"
import getPort from "get-port"
import { join } from "node:path"
import { getCliTestFixture } from "./fixtures/get-cli-test-fixture"

const BASIC_COMPONENT = `
  export const MyCircuit = () => (
    <board width="10mm" height="10mm">
      <chip name="U1" footprint="soic8" />
    </board>
  )
`

test("binary assets are uploaded via binary_content_b64", async () => {
  const fixture = await getCliTestFixture()

  const snippetPath = join(fixture.tmpDir, "snippet.tsx")
  const assetPath = join(fixture.tmpDir, "texture.png")

  await Bun.write(snippetPath, BASIC_COMPONENT)

  const binaryContent = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d])
  await Bun.write(assetPath, binaryContent)

  const devServerPort = await getPort()
  const devServer = new DevServer({
    port: devServerPort,
    componentFilePath: snippetPath,
  })

  try {
    await devServer.start()

    const { file } = await devServer.fsKy
      .get("api/files/get", {
        searchParams: { file_path: "texture.png" },
      })
      .json()

    const expectedBase64 = Buffer.from(binaryContent).toString("base64")
    expect(file.binary_content_b64).toBe(expectedBase64)
    expect(file.text_content).toBeUndefined()
  } finally {
    await devServer.stop()
  }
})
