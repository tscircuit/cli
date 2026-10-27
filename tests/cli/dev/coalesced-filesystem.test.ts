import { afterEach, expect, test } from "bun:test"
import { mkdtemp, mkdir, rename, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import getPort from "get-port"
import { DevServer } from "lib/dev/DevServer"

let server: DevServer
let directory: string
afterEach(async () => {
  await server?.stop()
  if (directory) await rm(directory, { recursive: true, force: true })
})
const source = (width: number) =>
  `export default () => <board width={${width}} height={10} />`
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
async function setup() {
  directory = await mkdtemp(join(tmpdir(), "tsci-coalescing-"))
  await writeFile(join(directory, "index.tsx"), source(10))
  server = new DevServer({
    port: await getPort(),
    projectDir: directory,
    componentFilePath: join(directory, "index.tsx"),
  })
  await server.start()
  await pause(150)
  await server.fsKy.post("api/events/reset", { json: {} })
}
async function updates() {
  const { event_list } = await server.fsKy.get("api/events/list").json()
  return event_list.filter(
    (e: any) => e.event_type === "FILE_UPDATED" && e.file_path === "index.tsx",
  )
}
async function content() {
  return (
    await server.fsKy
      .get("api/files/get", { searchParams: { file_path: "index.tsx" } })
      .json()
  ).file.text_content
}

test("rapid saves publish only the final source after a quiet period", async () => {
  await setup()
  for (let width = 11; width <= 15; width++) {
    await writeFile(join(directory, "index.tsx"), source(width))
    await pause(80)
  }
  await pause(700)
  console.log(`burst: ${(await updates()).length} file updates`)
  expect(await updates()).toHaveLength(1)
  expect(await content()).toBe(source(15))
})

test("single save, atomic replacement, same-content save and generated cache", async () => {
  await setup()
  await writeFile(join(directory, "index.tsx"), source(20))
  await pause(650)
  expect(await content()).toBe(source(20))
  await writeFile(join(directory, ".index.tsx.tmp"), source(30))
  await rename(join(directory, ".index.tsx.tmp"), join(directory, "index.tsx"))
  await pause(650)
  expect(await content()).toBe(source(30))
  await writeFile(join(directory, "index.tsx"), source(30))
  await mkdir(join(directory, ".tscircuit/cache"), { recursive: true })
  await writeFile(join(directory, ".tscircuit/cache/result.json"), "{}")
  await pause(650)
  expect(await updates()).toHaveLength(2)
})

test("continuous saves make progress and eventually publish the final edit", async () => {
  await setup()
  for (let width = 11; width <= 30; width++) {
    await writeFile(join(directory, "index.tsx"), source(width))
    await pause(100)
    if (width === 23) expect((await updates()).length).toBeGreaterThan(0)
  }
  await pause(650)
  expect(await content()).toBe(source(30))
  expect((await updates()).length).toBeLessThanOrEqual(3)
}, 6000)

test("disposal drops queued saves and file deletion is still delivered", async () => {
  await setup()
  await rm(join(directory, "index.tsx"))
  await pause(650)
  expect(
    (await server.fsKy.get("api/files/list").json()).file_list.map(
      (file) => file.file_path,
    ),
  ).not.toContain("index.tsx")
  await writeFile(join(directory, "index.tsx"), source(40))
  await pause(30)
  await server.stop()
  await pause(400)
})
