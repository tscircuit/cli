import { test, expect } from "bun:test"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"
import * as fs from "node:fs"
import * as path from "node:path"
import { gunzipSync } from "node:zlib"
import { getArchivePayload } from "lib/shared/push-snippet"

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

test("should attempt archive upload by default", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({ loggedIn: true })
  const snippetFilePath = path.resolve(tmpDir, "snippet.tsx")

  fs.writeFileSync(snippetFilePath, "// Snippet content")
  fs.writeFileSync(
    path.resolve(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.test-package", version: "1.0.0" }),
  )

  const { stdout, stderr, exitCode } = await runCommand(
    `tsci push ${snippetFilePath}`,
  )

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(stdout).toContain("Uploading package archive...")
  expect(stdout).toContain('"@tsci/test-user.test-package@1.0.0" published!')
}, 30_000)

test("should upload files individually when --no-compress is passed", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({ loggedIn: true })
  const snippetFilePath = path.resolve(tmpDir, "snippet.tsx")

  fs.writeFileSync(snippetFilePath, "// Snippet content")
  fs.writeFileSync(
    path.resolve(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.test-package", version: "1.0.0" }),
  )

  const { stdout, stderr, exitCode } = await runCommand(
    `tsci push ${snippetFilePath} --no-compress`,
  )

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(stdout).not.toContain("Uploading package archive...")
  expect(stdout).toContain("⬆︎ package.json")
  expect(stdout).toContain("⬆︎ snippet.tsx")
  expect(stdout).toContain('"@tsci/test-user.test-package@1.0.0" published!')
}, 30_000)

test("reconciles remote release after archive timeout when server accepted the full archive", async () => {
  const { tmpDir, runCommand, registryApiUrl, registryDb } =
    await getCliTestFixture({ loggedIn: true })
  const { getCliConfig } = await import("lib/cli-config")
  const snippetFilePath = path.resolve(tmpDir, "snippet.tsx")
  const binaryFilePath = path.resolve(tmpDir, "image.bin")

  fs.writeFileSync(snippetFilePath, "// Snippet content")
  fs.writeFileSync(binaryFilePath, Buffer.from([0, 1, 2, 255]))
  fs.writeFileSync(
    path.resolve(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.test-package", version: "1.0.0" }),
  )

  const createFilePaths: string[] = []
  let listCalls = 0

  const proxyServer = Bun.serve({
    port: 0,
    async fetch(req) {
      const url = new URL(req.url)
      if (url.pathname === "/api/package_files/upload_archive") {
        const body = (await req.json()) as {
          package_name_with_version: string
          archive_base64: string
        }
        const [pkgName, version] = body.package_name_with_version.split("@")
        const pkg = registryDb.packages.find((p) => p.name === pkgName)
        const release = registryDb.packageReleases.find(
          (pr) => pr.package_id === pkg?.package_id && pr.version === version,
        )
        const archive = JSON.parse(
          gunzipSync(Buffer.from(body.archive_base64, "base64")).toString(
            "utf8",
          ),
        ) as {
          files: Array<{
            file_path: string
            content_text?: string
            content_base64?: string
          }>
        }

        if (release) {
          for (const file of archive.files) {
            registryDb.addPackageFile({
              package_release_id: release.package_release_id,
              file_path: file.file_path,
              content_text: file.content_text ?? null,
              content_bytes: file.content_base64
                ? Buffer.from(file.content_base64, "base64")
                : null,
              content_mimetype: file.content_base64
                ? "application/octet-stream"
                : "text/plain",
              is_text: typeof file.content_text === "string",
              created_at: new Date().toISOString(),
            } as any)
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 200))
        return Response.json({ ok: true })
      }

      if (url.pathname === "/api/package_files/list") {
        listCalls++
      }

      if (url.pathname === "/api/package_files/create") {
        const cloned = await req.clone().json()
        createFilePaths.push(cloned.file_path)
      }

      const targetUrl = `${registryApiUrl}${url.pathname.replace(/^\/api/, "")}${url.search}`
      return fetch(targetUrl, {
        method: req.method,
        headers: req.headers,
        body:
          req.method === "GET" || req.method === "HEAD"
            ? undefined
            : await req.arrayBuffer(),
      })
    },
  })

  const prevTimeout = process.env.TSCI_UPLOAD_ARCHIVE_TIMEOUT_MS
  process.env.TSCI_UPLOAD_ARCHIVE_TIMEOUT_MS = "50"
  getCliConfig({ configDir: path.join(tmpDir, ".config") }).set(
    "registryApiUrl",
    `http://localhost:${proxyServer.port}/api`,
  )

  try {
    const { stdout, stderr, exitCode } = await runCommand(
      `tsci push ${snippetFilePath} --compress`,
    )

    expect(exitCode).toBe(0)
    expect(stderr).toBe("")
    expect(listCalls).toBeGreaterThan(0)
    expect(createFilePaths).toEqual([])
    expect(stdout).toContain("Uploading package archive...")
    expect(stdout).toContain("📦 Uploaded archive with 3 files")
    expect(stdout).not.toContain(
      "Archive upload failed, falling back to file-by-file upload",
    )
    expect(stdout).toContain("Succeeded: 3 files")
    expect(stdout).toContain('"@tsci/test-user.test-package@1.0.0" published!')
  } finally {
    if (prevTimeout === undefined) {
      delete process.env.TSCI_UPLOAD_ARCHIVE_TIMEOUT_MS
    } else {
      process.env.TSCI_UPLOAD_ARCHIVE_TIMEOUT_MS = prevTimeout
    }
    proxyServer.stop(true)
  }
}, 30_000)

test("uploads only missing and mismatched files when archive upload times out after partial persistence", async () => {
  const { tmpDir, runCommand, registryApiUrl, registryDb } =
    await getCliTestFixture({ loggedIn: true })
  const { getCliConfig } = await import("lib/cli-config")
  const snippetFilePath = path.resolve(tmpDir, "snippet.tsx")
  const extraFilePath = path.resolve(tmpDir, "extra.tsx")

  fs.writeFileSync(snippetFilePath, "// Fresh snippet content")
  fs.writeFileSync(extraFilePath, "export const extra = 1")
  const packageJsonContent = JSON.stringify({
    name: "@tsci/test-user.test-package",
    version: "1.0.0",
  })
  fs.writeFileSync(path.resolve(tmpDir, "package.json"), packageJsonContent)

  const createFilePaths: string[] = []

  const proxyServer = Bun.serve({
    port: 0,
    async fetch(req) {
      const url = new URL(req.url)
      if (url.pathname === "/api/package_files/upload_archive") {
        const body = (await req.json()) as {
          package_name_with_version: string
        }
        const [pkgName, version] = body.package_name_with_version.split("@")
        const pkg = registryDb.packages.find((p) => p.name === pkgName)
        const release = registryDb.packageReleases.find(
          (pr) => pr.package_id === pkg?.package_id && pr.version === version,
        )

        if (release) {
          // package.json is stored with matching content
          registryDb.addPackageFile({
            package_release_id: release.package_release_id,
            file_path: "package.json",
            content_text: packageJsonContent,
            content_mimetype: "application/json",
            is_text: true,
            created_at: new Date().toISOString(),
          } as any)
          // snippet.tsx is stored with mismatched content, and extra.tsx is missing
          registryDb.addPackageFile({
            package_release_id: release.package_release_id,
            file_path: "snippet.tsx",
            content_text: "// Stale or truncated content",
            content_mimetype: "text/typescript",
            is_text: true,
            created_at: new Date().toISOString(),
          } as any)
        }

        await new Promise((resolve) => setTimeout(resolve, 200))
        return Response.json({ ok: true })
      }

      if (url.pathname === "/api/package_files/create") {
        const cloned = await req.clone().json()
        createFilePaths.push(cloned.file_path)
      }

      const targetUrl = `${registryApiUrl}${url.pathname.replace(/^\/api/, "")}${url.search}`
      return fetch(targetUrl, {
        method: req.method,
        headers: req.headers,
        body:
          req.method === "GET" || req.method === "HEAD"
            ? undefined
            : await req.arrayBuffer(),
      })
    },
  })

  const prevTimeout = process.env.TSCI_UPLOAD_ARCHIVE_TIMEOUT_MS
  process.env.TSCI_UPLOAD_ARCHIVE_TIMEOUT_MS = "50"
  getCliConfig({ configDir: path.join(tmpDir, ".config") }).set(
    "registryApiUrl",
    `http://localhost:${proxyServer.port}/api`,
  )

  try {
    const { stdout, stderr, exitCode } = await runCommand(
      `tsci push ${snippetFilePath} --compress`,
    )

    expect(exitCode).toBe(0)
    expect(stderr).toBe("")
    expect(createFilePaths.sort()).toEqual(["extra.tsx", "snippet.tsx"])
    expect(stdout).toContain(
      "Archive upload failed, falling back to file-by-file upload",
    )
    expect(stdout).not.toContain("⬆︎ package.json")
    expect(stdout).toContain("⬆︎ snippet.tsx")
    expect(stdout).toContain("⬆︎ extra.tsx")
    expect(stdout).toContain("Succeeded: 3 files")
  } finally {
    if (prevTimeout === undefined) {
      delete process.env.TSCI_UPLOAD_ARCHIVE_TIMEOUT_MS
    } else {
      process.env.TSCI_UPLOAD_ARCHIVE_TIMEOUT_MS = prevTimeout
    }
    proxyServer.stop(true)
  }
}, 30_000)

test("does not claim success when archive times out without storing files and fallback uploads fail", async () => {
  const { tmpDir, runCommand, registryApiUrl } = await getCliTestFixture({
    loggedIn: true,
  })
  const { getCliConfig } = await import("lib/cli-config")
  const snippetFilePath = path.resolve(tmpDir, "snippet.tsx")

  fs.writeFileSync(snippetFilePath, "// Snippet content")
  fs.writeFileSync(
    path.resolve(tmpDir, "package.json"),
    JSON.stringify({ name: "@tsci/test-user.test-package", version: "1.0.0" }),
  )

  const createFilePaths: string[] = []

  const proxyServer = Bun.serve({
    port: 0,
    async fetch(req) {
      const url = new URL(req.url)
      if (url.pathname === "/api/package_files/upload_archive") {
        await new Promise((resolve) => setTimeout(resolve, 200))
        return Response.json({ ok: false }, { status: 504 })
      }

      if (url.pathname === "/api/package_files/create") {
        const cloned = await req.clone().json()
        createFilePaths.push(cloned.file_path)
        return Response.json(
          { error: { error_code: "upload_failed", message: "Upload failed" } },
          { status: 500 },
        )
      }

      const targetUrl = `${registryApiUrl}${url.pathname.replace(/^\/api/, "")}${url.search}`
      return fetch(targetUrl, {
        method: req.method,
        headers: req.headers,
        body:
          req.method === "GET" || req.method === "HEAD"
            ? undefined
            : await req.arrayBuffer(),
      })
    },
  })

  const prevTimeout = process.env.TSCI_UPLOAD_ARCHIVE_TIMEOUT_MS
  process.env.TSCI_UPLOAD_ARCHIVE_TIMEOUT_MS = "50"
  getCliConfig({ configDir: path.join(tmpDir, ".config") }).set(
    "registryApiUrl",
    `http://localhost:${proxyServer.port}/api`,
  )

  try {
    const { stdout, stderr, exitCode } = await runCommand(
      `tsci push ${snippetFilePath} --compress`,
    )

    expect(exitCode).toBe(1)
    expect(createFilePaths.sort()).toEqual(["package.json", "snippet.tsx"])
    expect(stdout).toContain(
      "Archive upload failed, falling back to file-by-file upload",
    )
    expect(stdout).toContain("Succeeded: 0 files")
    expect(stdout).toContain("Failed: 2 files")
    expect(stderr).toContain("Publish completed with 2 failed upload(s)")
  } finally {
    if (prevTimeout === undefined) {
      delete process.env.TSCI_UPLOAD_ARCHIVE_TIMEOUT_MS
    } else {
      process.env.TSCI_UPLOAD_ARCHIVE_TIMEOUT_MS = prevTimeout
    }
    proxyServer.stop(true)
  }
}, 30_000)
