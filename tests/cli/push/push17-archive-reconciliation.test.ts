import { expect, spyOn, test } from "bun:test"
import { Request as EdgeRuntimeRequest } from "@edge-runtime/primitives"
import { createDatabase, seed } from "@tscircuit/fake-snippets"
import fakeRegistryBundle from "@tscircuit/fake-snippets/bundle"
import { TimeoutError } from "ky"
import { cliConfig } from "lib/cli-config"
import { pushSnippet } from "lib/shared/push-snippet"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { gunzipSync } from "node:zlib"

test.each([
  "timeout",
  "disconnect",
  "partial",
  "mismatched-text",
  "empty-release",
  "rejected",
  "server-error",
  "request-timeout",
  "unreadable-list",
  "unreadable-file",
  "changed-local-file",
  "success",
  "no-compress",
])("push reconciles archive outcome: %s", async (scenario) => {
  const projectDir = mkdtempSync(path.join(tmpdir(), "tsci-archive-"))
  const cwdSpy = spyOn(process, "cwd").mockReturnValue(projectDir)
  const db = createDatabase()
  seed(db)
  const config = {
    sessionToken: db.accounts[0].account_id,
    tscircuitHandle: "testuser",
    registryApiUrl: "https://registry.test/api",
  }
  const configSpy = spyOn(cliConfig, "get").mockImplementation(
    (key: string) => config[key as keyof typeof config],
  )
  const previousToken = process.env.TSCIRCUIT_TOKEN
  delete process.env.TSCIRCUIT_TOKEN
  const requests: string[] = []
  const uploads: string[] = []
  const logs: string[] = []
  const errors: string[] = []
  const exits: number[] = []
  const registryRequest = (request: Request) =>
    fakeRegistryBundle.makeRequest(
      new EdgeRuntimeRequest(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      }) as any,
      {
        middleware: [
          async (req: any, ctx: any, next: any) => {
            ctx.db = db
            return next(req, ctx)
          },
        ],
      },
    )
  const fetchSpy = spyOn(globalThis, "fetch").mockImplementation(
    Object.assign(
      async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
        const request = new Request(input, init)
        const pathname = new URL(request.url).pathname
        requests.push(pathname)
        if (pathname === "/api/package_files/list")
          expect(
            new URL(request.url).searchParams.get("package_name_with_version"),
          ).toBe("testuser/my-test-board@9.0.0-test")
        if (pathname === "/api/package_files/upload_archive") {
          if (scenario === "rejected")
            return Response.json(
              { error: { error_code: "invalid_archive" } },
              { status: 400 },
            )
          const payload = await request.clone().json()
          const { files } = JSON.parse(
            gunzipSync(Buffer.from(payload.archive_base64, "base64")).toString(
              "utf8",
            ),
          )
          // Store the archive in the existing fake registry, then lose the response.
          const version = payload.package_name_with_version.split("@")[1]
          const release = db.packageReleases.find(
            (release) => release.version === version,
          )!
          for (const file of files) {
            if (scenario === "empty-release") continue
            if (scenario === "partial" && file.file_path === "index.tsx")
              continue
            db.addPackageFile({
              package_release_id: release.package_release_id,
              file_path: file.file_path,
              is_text: file.content_text !== undefined,
              content_text:
                scenario === "mismatched-text" && file.file_path === "index.tsx"
                  ? `${file.content_text.slice(0, -1)}!`
                  : (file.content_text ?? null),
              content_bytes:
                file.content_base64 === undefined
                  ? null
                  : scenario === "partial"
                    ? Buffer.from([0, 1, 2, 254])
                    : Buffer.from(file.content_base64, "base64"),
              created_at: new Date().toISOString(),
            })
          }
          expect(
            db.packageFiles.filter(
              (file) => file.package_release_id === release.package_release_id,
            ),
          ).toHaveLength(
            scenario === "empty-release" ? 0 : scenario === "partial" ? 3 : 4,
          )
          if (scenario === "changed-local-file" || scenario === "partial")
            writeFileSync(
              path.join(projectDir, "index.tsx"),
              "// Modified during upload",
            )
          if (scenario === "success") return Response.json({ ok: true })
          if (scenario === "disconnect")
            throw new TypeError("Connection closed after upload")
          if (scenario === "server-error" || scenario === "request-timeout")
            return new Response("Response lost at upstream", {
              status: scenario === "server-error" ? 503 : 408,
            })
          throw new TimeoutError(request)
        }
        if (
          (scenario === "unreadable-list" &&
            pathname === "/api/package_files/list") ||
          (scenario === "unreadable-file" &&
            pathname === "/api/package_files/download")
        ) {
          return new Response("Cannot verify release", { status: 403 })
        }
        if (pathname === "/api/package_files/create") {
          const file = await request.clone().json()
          uploads.push(file.file_path)
          if (file.file_path === "image.png")
            expect(file.content_base64).toBe(
              Buffer.from([0, 1, 2, 255]).toString("base64"),
            )
          if (file.file_path === "index.tsx")
            expect(file.content_text).toBe("// Snippet content")
          // The fake registry's create route rejects empty text, unlike the archive route.
          if (file.content_text === "") {
            const release = db.packageReleases.find(
              (release) => release.version === "9.0.0-test",
            )!
            db.addPackageFile({
              package_release_id: release.package_release_id,
              file_path: file.file_path,
              is_text: true,
              content_text: "",
              created_at: new Date().toISOString(),
            })
            return Response.json({ ok: true })
          }
        }
        return registryRequest(request)
      },
      { preconnect: globalThis.fetch.preconnect },
    ),
  )

  try {
    writeFileSync(path.join(projectDir, "index.tsx"), "// Snippet content")
    writeFileSync(
      path.join(projectDir, "image.png"),
      Buffer.from([0, 1, 2, 255]),
    )
    writeFileSync(path.join(projectDir, "empty.txt"), "")
    writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify({
        name: "testuser/my-test-board",
        version: "9.0.0",
      }),
    )

    await pushSnippet({
      filePath: path.join(projectDir, "index.tsx"),
      versionTag: "test",
      compress: scenario !== "no-compress",
      log: (message) => logs.push(message),
      onError: (message) => errors.push(message),
      onSuccess: (message) => logs.push(message),
      onExit: (code) => {
        exits.push(code)
      },
    })

    const release = db.packageReleases.find(
      (release) => release.version === "9.0.0-test",
    )!
    if (scenario === "unreadable-list" || scenario === "unreadable-file") {
      expect(errors.join("\n")).toContain(
        "Could not verify archive upload outcome",
      )
      expect(uploads).toEqual([])
      expect(exits).toEqual([1])
      expect(release.ready_to_build).toBe(false)
      expect(requests).not.toContain("/api/package_releases/update")
      expect(logs.join("\n")).not.toContain("published!")
      return
    }
    expect(uploads).toEqual(
      scenario === "partial"
        ? ["image.png", "index.tsx"]
        : scenario === "mismatched-text"
          ? ["index.tsx"]
          : scenario === "rejected" ||
              scenario === "no-compress" ||
              scenario === "empty-release"
            ? ["empty.txt", "image.png", "index.tsx", "package.json"]
            : [],
    )
    if (["rejected", "success", "no-compress"].includes(scenario)) {
      expect(requests).not.toContain("/api/package_files/list")
    } else {
      expect(requests).toContain("/api/package_files/list")
    }
    expect(errors).toEqual([])
    expect(exits).toEqual([0])
    expect(release.ready_to_build).toBe(true)
    expect(logs.join("\n")).toContain("Succeeded: 4 files")
    if (scenario !== "rejected")
      expect(logs.join("\n")).not.toContain("Archive upload failed")
  } finally {
    fetchSpy.mockRestore()
    configSpy.mockRestore()
    cwdSpy.mockRestore()
    if (previousToken === undefined) delete process.env.TSCIRCUIT_TOKEN
    else process.env.TSCIRCUIT_TOKEN = previousToken
    rmSync(projectDir, { recursive: true, force: true })
  }
})
