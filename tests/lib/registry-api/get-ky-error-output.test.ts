import { expect, test } from "bun:test"
import ky, { type Options } from "ky"
import { prettyResponseErrorHook } from "lib/registry-api/get-ky"

const captureError = async (
  pathname: string,
  options: Options,
  createResponse = () =>
    Response.json(
      {
        error: {
          error_code: "request_too_large",
          message: "Request payload exceeds the registry limit",
        },
      },
      { status: 413 },
    ),
) => {
  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    fetch: () => createResponse(),
  })

  try {
    const error = await ky
      .post(new URL(pathname, server.url), {
        ...options,
        retry: 0,
        hooks: { afterResponse: [prettyResponseErrorHook] },
      })
      .then(
        () => undefined,
        (error: unknown) => error,
      )

    expect(error).toBeInstanceOf(Error)
    return error as Error
  } finally {
    server.stop(true)
  }
}

test("rejected archive uploads do not dump the encoded project into the error", async () => {
  const archive = Buffer.alloc(1024 * 1024, "a").toString("base64")
  const error = await captureError("/package_files/upload_archive", {
    json: {
      package_name_with_version: "test-user/test-package@1.0.0",
      archive_base64: archive,
    },
  })

  expect(error.message.length).toBeLessThan(4096)
  expect(error.message).not.toContain(archive.slice(0, 80))
  expect(error.message).toContain(
    "FAIL [413]: POST /package_files/upload_archive",
  )
  expect(error.message).toContain("request_too_large")
  expect(error.message).toContain("Request payload exceeds the registry limit")
  expect(error.message).toContain("test-user/test-package@1.0.0")
  expect(error).toMatchObject({
    status: 413,
    method: "POST",
    pathname: "/package_files/upload_archive",
    url: expect.stringMatching(/\/package_files\/upload_archive$/),
  })
})

test.each(["content_text", "content_base64"])(
  "individual upload errors omit %s while preserving the file path",
  async (field) => {
    const content = "PRIVATE_BOARD_CONTENT_".repeat(10_000)
    const error = await captureError("/package_files/create", {
      json: {
        package_name_with_version: "test-user/test-package@1.0.0",
        file_path: "dist/index/circuit.json",
        [field]: content,
      },
    })

    expect(error.message.length).toBeLessThan(4096)
    expect(error.message).not.toContain("PRIVATE_BOARD_CONTENT_")
    expect(error.message).toContain("dist/index/circuit.json")
  },
)

test("small upload payloads are omitted as well", async () => {
  const error = await captureError("/package_files/upload_archive", {
    json: { archive_base64: "PRIVATE_SMALL_ARCHIVE" },
  })

  expect(error.message).not.toContain("PRIVATE_SMALL_ARCHIVE")
})

test("small request metadata remains available for diagnostics", async () => {
  const error = await captureError("/packages/create", {
    json: { name: "test-user/test-package", is_private: false },
  })

  expect(error.message).toMatch(/"name":\s*"test-user\/test-package"/)
  expect(error.message).toMatch(/"is_private":\s*false/)
})

test("large non-JSON request bodies are bounded", async () => {
  const error = await captureError("/packages/create", {
    body: "diagnostic text ".repeat(10_000),
  })

  expect(error.message.length).toBeLessThan(4096)
  expect(error.message).toContain("diagnostic text")
  expect(error.message).toContain("truncated")
})

test("large registry error responses cannot flood the diagnostic either", async () => {
  const error = await captureError("/package_files/upload_archive", {}, () =>
    Response.json(
      {
        error: {
          error_code: "request_too_large",
          message: "Request rejected: ".repeat(10_000),
        },
        archive_base64: "PRIVATE_ECHOED_ARCHIVE",
      },
      { status: 413 },
    ),
  )

  expect(error.message.length).toBeLessThan(4096)
  expect(error.message).not.toContain("PRIVATE_ECHOED_ARCHIVE")
  expect(error.message).toContain("request_too_large")
})
