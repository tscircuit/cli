import { expect, test } from "bun:test"
import { getCliConfig } from "lib/cli-config"
import { writeFileSync } from "node:fs"
import path from "node:path"
import { gzipSync, gunzipSync } from "node:zlib"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

type ArchiveFile = {
  file_path: string
  content_text?: string
  content_base64?: string
}

const setup = async ({
  archiveStatus = 503,
  loseResponse = false,
  missingFiles = [] as string[],
  mismatchedFiles = [] as string[],
  verificationFailure = "",
  changeSourceDuringUpload = false,
} = {}) => {
  const fixture = await getCliTestFixture({ loggedIn: true })
  const { tmpDir, registryApiUrl } = fixture
  writeFileSync(path.join(tmpDir, "index.tsx"), "// Snippet content")
  writeFileSync(path.join(tmpDir, "image.png"), Buffer.from([0, 1, 2, 255]))
  writeFileSync(path.join(tmpDir, "notes.txt"), "Board notes")
  writeFileSync(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.test-package", version: "1.0.0" }),
  )

  const requests: string[] = []
  const uploads: ArchiveFile[] = []
  const packageNameWithVersion = "test-user/test-package@1.0.0-test"
  const proxy = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    idleTimeout: 30,
    async fetch(request) {
      const url = new URL(request.url)
      requests.push(url.pathname)
      const requestBody = request.body ? await request.arrayBuffer() : undefined
      const forward = (body = requestBody) => {
        url.host = new URL(registryApiUrl).host
        const headers = new Headers(request.headers)
        headers.delete("content-length")
        return fetch(url, { method: request.method, headers, body })
      }

      if (url.pathname === "/api/package_files/upload_archive") {
        if (archiveStatus === 400) {
          return Response.json(
            { error: { error_code: "invalid_archive" } },
            { status: 400 },
          )
        }

        let archiveBody = requestBody
        if (missingFiles.length > 0 || mismatchedFiles.length > 0) {
          const payload = JSON.parse(Buffer.from(requestBody!).toString("utf8"))
          const archive: { files: ArchiveFile[] } = JSON.parse(
            gunzipSync(Buffer.from(payload.archive_base64, "base64")).toString(
              "utf8",
            ),
          )
          archive.files = archive.files
            .filter((file) => !missingFiles.includes(file.file_path))
            .map((file) => {
              if (!mismatchedFiles.includes(file.file_path)) return file
              if (file.content_text !== undefined)
                return {
                  ...file,
                  content_text: `${file.content_text.slice(0, -1)}!`,
                }
              const bytes = Buffer.from(file.content_base64!, "base64")
              bytes[0] ^= 255
              return { ...file, content_base64: bytes.toString("base64") }
            })
          payload.archive_base64 = gzipSync(JSON.stringify(archive)).toString(
            "base64",
          )
          archiveBody = new TextEncoder().encode(JSON.stringify(payload)).buffer
        }
        const response = await forward(archiveBody)
        expect(response.status).toBe(200)
        await response.arrayBuffer()
        if (changeSourceDuringUpload) {
          writeFileSync(
            path.join(tmpDir, "index.tsx"),
            "// Changed during upload",
          )
        }
        // Keep this request open after storing the archive so the real CLI times out.
        if (loseResponse) return new Promise<Response>(() => {})
        return Response.json(
          { ok: archiveStatus === 200 },
          { status: archiveStatus },
        )
      }

      if (url.pathname === "/api/package_files/list") {
        expect(url.searchParams.get("package_name_with_version")).toBe(
          packageNameWithVersion,
        )
      }
      if (url.pathname === `/api/package_files/${verificationFailure}`) {
        return new Response("Cannot verify release", { status: 403 })
      }
      if (url.pathname === "/api/package_files/create") {
        const { package_name_with_version, ...file } = JSON.parse(
          Buffer.from(requestBody!).toString("utf8"),
        )
        expect(package_name_with_version).toBe(packageNameWithVersion)
        uploads.push(file)
      }

      return forward()
    },
  })
  globalThis.deferredCleanupFns.push(async () => {
    proxy.stop(true)
  })
  getCliConfig({ configDir: path.join(tmpDir, ".config") }).set(
    "registryApiUrl",
    `http://127.0.0.1:${proxy.port}/api`,
  )

  return { ...fixture, requests, uploads }
}

test("push verifies an accepted archive after a real response timeout without reuploading files", async () => {
  const { tmpDir, runCommand, registryDb, requests, uploads } = await setup({
    loseResponse: true,
  })
  writeFileSync(path.join(tmpDir, "empty.txt"), "")

  const { stdout, stderr, exitCode } = await runCommand(
    "tsci push --compress --version-tag test",
  )

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(stdout).toContain("TimeoutError")
  expect(stdout).toContain("Succeeded: 5 files")
  expect(stdout).not.toContain("Archive upload failed")
  expect(requests).toContain("/api/package_files/list")
  expect(uploads).toEqual([])
  const release = registryDb.packageReleases.find(
    (release) => release.version === "1.0.0-test",
  )!
  expect(
    registryDb.packageFiles.filter(
      (file) => file.package_release_id === release.package_release_id,
    ),
  ).toHaveLength(5)
  expect(release.ready_to_build).toBe(true)
}, 30_000)

test("push retries only missing or mismatched archive files using the original snapshot", async () => {
  const { runCommand, requests, uploads } = await setup({
    missingFiles: ["index.tsx"],
    mismatchedFiles: ["image.png", "notes.txt"],
    changeSourceDuringUpload: true,
  })

  const { stdout, stderr, exitCode } = await runCommand(
    "tsci push --compress --version-tag test",
  )

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(requests).toContain("/api/package_files/list")
  expect(uploads).toEqual([
    {
      file_path: "image.png",
      content_base64: Buffer.from([0, 1, 2, 255]).toString("base64"),
    },
    { file_path: "index.tsx", content_text: "// Snippet content" },
    {
      file_path: "notes.txt",
      content_text: "Board notes",
    },
  ])
  expect(stdout).toContain("Succeeded: 4 files")
}, 30_000)

test("push falls back to individual uploads after a definite archive rejection", async () => {
  const { runCommand, requests, uploads } = await setup({ archiveStatus: 400 })

  const { stdout, stderr, exitCode } = await runCommand(
    "tsci push --compress --version-tag test",
  )

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(requests).not.toContain("/api/package_files/list")
  expect(uploads.map((file) => file.file_path)).toEqual([
    "image.png",
    "index.tsx",
    "notes.txt",
    "package.json",
  ])
  expect(stdout).toContain(
    "Archive upload failed, falling back to file-by-file upload",
  )
}, 30_000)

test.each(["list", "download"])(
  "push stops when archive verification fails at package_files/%s",
  async (endpoint) => {
    const { runCommand, requests, uploads } = await setup({
      verificationFailure: endpoint,
    })

    const { stdout, stderr, exitCode } = await runCommand(
      "tsci push --compress --version-tag test",
    )

    expect(exitCode).toBe(1)
    expect(stderr).toContain("Could not verify archive upload outcome")
    expect(stdout).not.toContain("published!")
    expect(uploads).toEqual([])
    expect(requests).not.toContain("/api/package_releases/update")
  },
  30_000,
)
