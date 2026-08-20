import { expect, test } from "bun:test"
import * as fs from "node:fs"
import * as path from "node:path"
import { gunzipSync } from "node:zlib"
import { getArchivePayload } from "lib/shared/push-snippet"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test("compressed upload payload matches the registry archive format", async () => {
  const { tmpDir } = await getCliTestFixture()
  const textFilePath = path.resolve(tmpDir, "snippet.tsx")
  const binaryFilePath = path.resolve(tmpDir, "image.bin")

  fs.writeFileSync(textFilePath, "// Snippet content")
  fs.writeFileSync(binaryFilePath, Buffer.from([0, 1, 2, 255]))

  const payload = getArchivePayload(
    [textFilePath, binaryFilePath],
    tmpDir,
    "test-user/test-package@1.0.0",
  )
  const archive = JSON.parse(
    gunzipSync(Buffer.from(payload.archive_base64, "base64")).toString("utf8"),
  )

  expect(payload.package_name_with_version).toBe("test-user/test-package@1.0.0")
  expect(archive).toEqual({
    files: [
      {
        file_path: "snippet.tsx",
        content_text: "// Snippet content",
      },
      {
        file_path: "image.bin",
        content_base64: Buffer.from([0, 1, 2, 255]).toString("base64"),
      },
    ],
  })
})

test("should attempt archive upload when TSCI_PUSH_ARCHIVE is enabled", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({ loggedIn: true })
  const snippetFilePath = path.resolve(tmpDir, "snippet.tsx")

  fs.writeFileSync(snippetFilePath, "// Snippet content")
  fs.writeFileSync(
    path.resolve(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.test-package", version: "1.0.0" }),
  )

  const previousArchiveFlag = process.env.TSCI_PUSH_ARCHIVE
  process.env.TSCI_PUSH_ARCHIVE = "1"

  let stdout = ""
  let stderr = ""
  try {
    const result = await runCommand(`tsci push ${snippetFilePath}`)
    stdout = result.stdout
    stderr = result.stderr
  } finally {
    process.env.TSCI_PUSH_ARCHIVE = previousArchiveFlag
  }

  expect(stderr).toBe("")
  expect(stdout).toContain("Uploading package archive...")
  expect(stdout).toContain(
    "Archive upload failed, falling back to file-by-file upload",
  )
  expect(stdout).toContain("⬆︎ package.json")
  expect(stdout).toContain("⬆︎ snippet.tsx")
  expect(stdout).toContain('"@tsci/test-user.test-package@1.0.0" published!')
}, 30_000)

test("should attempt archive upload when --compress is passed", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({ loggedIn: true })
  const snippetFilePath = path.resolve(tmpDir, "snippet.tsx")

  fs.writeFileSync(snippetFilePath, "// Snippet content")
  fs.writeFileSync(
    path.resolve(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.test-package", version: "1.0.0" }),
  )

  const { stdout, stderr } = await runCommand(
    `tsci push ${snippetFilePath} --compress`,
  )

  expect(stderr).toBe("")
  expect(stdout).toContain("Uploading package archive...")
  expect(stdout).toContain(
    "Archive upload failed, falling back to file-by-file upload",
  )
  expect(stdout).toContain("⬆︎ package.json")
  expect(stdout).toContain("⬆︎ snippet.tsx")
  expect(stdout).toContain('"@tsci/test-user.test-package@1.0.0" published!')
}, 30_000)
