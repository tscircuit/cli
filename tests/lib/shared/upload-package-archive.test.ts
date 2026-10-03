import { expect, test } from "bun:test"
import ky from "ky"
import { uploadPackageArchive } from "lib/shared/upload-package-archive"

const payload = {
  package_name_with_version: "test-user/large-package@0.0.1",
  archive_base64: "test archive",
}

test("a valid archive upload can finish after Ky's default ten-second timeout", async () => {
  let requests = 0
  const server = Bun.serve({
    port: 0,
    async fetch() {
      requests++
      await Bun.sleep(10_100)
      return Response.json({ ok: true })
    },
  })
  try {
    expect(
      await uploadPackageArchive({
        ky: ky.create({ prefixUrl: server.url }),
        payload,
      }),
    ).toBe("uploaded")
    expect(requests).toBe(1)
  } finally {
    server.stop(true)
  }
}, 20_000)

test("an archive timeout is not treated as unsupported and does not retry", async () => {
  let requests = 0
  const server = Bun.serve({
    port: 0,
    async fetch() {
      requests++
      await Bun.sleep(100)
      return Response.json({ ok: true })
    },
  })
  try {
    await expect(
      uploadPackageArchive({
        ky: ky.create({ prefixUrl: server.url }),
        payload,
        timeoutMs: 20,
      }),
    ).rejects.toMatchObject({ name: "TimeoutError" })
    expect(requests).toBe(1)
  } finally {
    server.stop(true)
  }
})

test("only an explicitly unsupported archive endpoint permits fallback", async () => {
  for (const status of [400, 401, 403, 404, 405, 409, 500, 501, 502]) {
    const client = ky.create({
      prefixUrl: "https://registry.example.test",
      fetch: async () => new Response("test response", { status }),
    })
    const request = uploadPackageArchive({ ky: client, payload })
    if ([404, 405, 501].includes(status)) {
      expect(await request).toBe("unsupported")
    } else {
      await expect(request).rejects.toMatchObject({
        response: { status },
      })
    }
  }
})
