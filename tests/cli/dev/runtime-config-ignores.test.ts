import { expect, test } from "bun:test"
import { once } from "node:events"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { DevServer } from "cli/dev/DevServer"
import getPort from "get-port"
import type { KyInstance } from "ky"
import { createHttpServer } from "lib/server/createHttpServer"
import { temporaryDirectory } from "tempy"

const ignoredFiles = ["checks", "dist"]
const files = {
  "src/index.tsx": "export default () => <board />",
  "checks/scratch.circuit.json": "[]",
  "dist/board.circuit.json": "[]",
}

async function fixture(mode: string) {
  const projectDir = temporaryDirectory()
  for (const [file, content] of Object.entries(files))
    await Bun.write(join(projectDir, file), content)
  if (mode !== "none") {
    const config = JSON.stringify({ ignoredFiles })
    const extension = ["mixed", "fallback"].includes(mode) ? "ts" : mode
    await Bun.write(
      join(projectDir, `tscircuit.config.${extension}`),
      mode === "json"
        ? config
        : `export default ${mode === "fallback" ? "{}" : config}`,
    )
    if (["mixed", "fallback"].includes(mode))
      await Bun.write(
        join(projectDir, "tscircuit.config.json"),
        JSON.stringify({
          ignoredFiles: mode === "mixed" ? ["src"] : ignoredFiles,
        }),
      )
  }
  const server = new DevServer({
    port: await getPort(),
    projectDir,
    componentFilePath: join(projectDir, "src/index.tsx"),
  })
  globalThis.deferredCleanupFns.push(async () => {
    await server.stop()
    await rm(projectDir, { recursive: true, force: true })
  })
  // Clear the file-server bundle's shared storage before event polling starts.
  server.httpServer = (await createHttpServer({ port: server.port })).server
  const { file_list } = await server.fsKy.get("api/files/list").json()
  for (const file of file_list)
    await server.fsKy.post("api/files/delete", {
      json: { file_path: file.file_path, initiator: "filesystem_change" },
    })
  await server.fsKy.post("api/events/reset", { json: {} })
  await new Promise<void>((resolve) =>
    server.httpServer!.close(() => resolve()),
  )
  return { server, projectDir }
}

for (const mode of ["json", "ts", "js", "mixed", "fallback", "none"]) {
  test(`initial upload: ${mode} config ignores`, async () => {
    const { server } = await fixture(mode)
    await server.start()
    const { file_list } = await server.fsKy.get("api/files/list").json()
    expect(
      file_list
        .map((file) => file.file_path)
        .filter((file) => file in files)
        .sort(),
    ).toEqual(mode === "none" ? Object.keys(files).sort() : ["src/index.tsx"])
  })
}

test("explicit API ignores survive startup", async () => {
  const { server } = await fixture("mixed")
  expect(server.ignoredFiles).toEqual(["src"])
  server.ignoredFiles = ["src", ...ignoredFiles]
  await server.start()
  const { file_list } = await server.fsKy.get("api/files/list").json()
  expect(file_list.filter((file) => file.file_path in files)).toEqual([])
})

test("watch uploads honor TS ignores", async () => {
  const { server, projectDir } = await fixture("ts")
  await server.start()
  const watcher = server.filesystemWatcher!
  if (!watcher.getWatched()[projectDir]) await once(watcher, "ready")
  const synced: string[] = []
  server.fsKy = (server.fsKy as unknown as KyInstance).extend({
    hooks: {
      beforeRequest: [
        async (request) => {
          if (new URL(request.url).pathname === "/api/files/upsert")
            synced.push((await request.clone().json()).file_path)
        },
      ],
    },
  }) as typeof server.fsKy
  const changed = once(watcher, "change")
  for (const file of [
    "checks/scratch.circuit.json",
    "dist/new.circuit.json",
    "src/index.tsx",
  ]) {
    await Bun.write(
      join(projectDir, file),
      file.endsWith("tsx")
        ? "export default () => <board name='updated' />"
        : "[1]",
    )
  }
  await changed
  for (let n = 0; n < 100 && !synced.includes("src/index.tsx"); n++)
    await Bun.sleep(10)
  // Await ignored handlers directly so exclusion does not depend on event timing.
  for (const file of ["checks/scratch.circuit.json", "dist/new.circuit.json"])
    await server.handleFileChangedOnFilesystem(join(projectDir, file))
  expect([...new Set(synced)].sort()).toEqual(["src/index.tsx"])
})
