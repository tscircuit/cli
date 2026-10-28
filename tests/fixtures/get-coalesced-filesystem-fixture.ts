import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import getPort from "get-port"
import { DevServer } from "lib/dev/DevServer"

export const source = (width: number) =>
  `export default () => <board width={${width}} height={10} />`
export const pause = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

export async function getCoalescedFilesystemFixture() {
  const directory = await mkdtemp(join(tmpdir(), "tsci-coalescing-"))
  const server = new DevServer({
    port: await getPort(),
    projectDir: directory,
    componentFilePath: join(directory, "index.tsx"),
  })
  globalThis.deferredCleanupFns.push(async () => {
    await server.stop()
    await rm(directory, { recursive: true, force: true })
  })
  await writeFile(join(directory, "index.tsx"), source(10))
  await server.start()
  await pause(150)
  await server.fsKy.post("api/events/reset", { json: {} })

  return {
    server,
    directory,
    async updates(filePath = "index.tsx") {
      const { event_list } = await server.fsKy.get("api/events/list").json()
      return event_list.filter(
        (event) =>
          event.event_type === "FILE_UPDATED" && event.file_path === filePath,
      )
    },
    async content() {
      return (
        await server.fsKy
          .get("api/files/get", { searchParams: { file_path: "index.tsx" } })
          .json()
      ).file.text_content
    },
  }
}
