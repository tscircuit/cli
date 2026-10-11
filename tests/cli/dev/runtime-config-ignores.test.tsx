import { expect, test } from "bun:test"
import { once } from "node:events"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { DevServer } from "cli/dev/DevServer"
import getPort from "get-port"
import type { KyInstance } from "ky"
import { createHttpServer } from "lib/server/createHttpServer"
import type { ReactElement } from "react"
import { temporaryDirectory } from "tempy"
import { RootCircuit } from "tscircuit"

const regression = process.env.TSCI_ASSERT_CONFIG_IGNORES ? test : test.failing
const source = `export default () => (
  <board width={10} height={8} routingDisabled>
    <resistor name="R1" resistance="1k" footprint="0402" />
  </board>
)`

async function render(element: ReactElement, capture = false) {
  const circuit = new RootCircuit()
  circuit.add(element)
  await circuit.renderUntilSettled()
  const json = circuit.getCircuitJson()
  expect(
    json.some(
      (element) => element.type === "source_component" && element.name === "R1",
    ),
  ).toBe(true)
  if (capture && process.env.TSCI_CONFIG_RENDER_PATH)
    await Bun.write(
      process.env.TSCI_CONFIG_RENDER_PATH,
      convertCircuitJsonToSchematicSvg(json, {
        colorOverrides: { schematic: { background: "#fff" } },
      }),
    )
  return json
}

async function fixture(
  json: AnyCircuitElement[],
  configs: Record<string, string> = {},
) {
  const projectDir = temporaryDirectory()
  await Bun.write(join(projectDir, "src/index.tsx"), source)
  await Bun.write(
    join(projectDir, "checks/scratch.circuit.json"),
    JSON.stringify(json),
  )
  await Bun.write(
    join(projectDir, "dist/board.circuit.json"),
    JSON.stringify(json),
  )
  for (const [file, content] of Object.entries(configs))
    await Bun.write(join(projectDir, file), content)
  const server = new DevServer({
    port: await getPort(),
    projectDir,
    componentFilePath: join(projectDir, "src/index.tsx"),
  })
  globalThis.deferredCleanupFns.push(async () => {
    await server.stop()
    await rm(projectDir, { recursive: true, force: true })
  })
  // Clear shared file-server storage before event polling starts.
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

async function uploaded(server: DevServer) {
  const { file_list } = await server.fsKy.get("api/files/list").json()
  return file_list
    .map((file) => file.file_path)
    .filter((file) => !file.startsWith("tscircuit.config."))
    .sort()
}

regression("TS ignores exclude live circuit output at startup", async () => {
  const json = await render(
    <board width={10} height={8} routingDisabled>
      <resistor name="R1" resistance="1k" footprint="0402" />
    </board>,
    true,
  )
  const { server } = await fixture(json, {
    "tscircuit.config.ts":
      'export default { ignoredFiles: ["checks", "dist"] }',
  })
  await server.start()
  expect(await uploaded(server)).toEqual(["src/index.tsx"])
})

regression("JS ignores exclude live circuit output at startup", async () => {
  const json = await render(
    <board width={10} height={8} routingDisabled>
      <resistor name="R1" resistance="1k" footprint="0402" />
    </board>,
  )
  const { server } = await fixture(json, {
    "tscircuit.config.js":
      'export default { ignoredFiles: ["checks", "dist"] }',
  })
  await server.start()
  expect(await uploaded(server)).toEqual(["src/index.tsx"])
})

regression("TS ignores take priority over JSON ignores", async () => {
  const json = await render(
    <board width={10} height={8} routingDisabled>
      <resistor name="R1" resistance="1k" footprint="0402" />
    </board>,
  )
  const { server } = await fixture(json, {
    "tscircuit.config.json": '{ "ignoredFiles": ["src"] }',
    "tscircuit.config.ts":
      'export default { ignoredFiles: ["checks", "dist"] }',
  })
  await server.start()
  expect(await uploaded(server)).toEqual(["src/index.tsx"])
})

test("JSON ignores exclude live circuit output", async () => {
  const json = await render(
    <board width={10} height={8} routingDisabled>
      <resistor name="R1" resistance="1k" footprint="0402" />
    </board>,
  )
  const { server } = await fixture(json, {
    "tscircuit.config.json": '{ "ignoredFiles": ["checks", "dist"] }',
  })
  await server.start()
  expect(await uploaded(server)).toEqual(["src/index.tsx"])
})

test("JSON ignores survive a TS config without ignores", async () => {
  const json = await render(
    <board width={10} height={8} routingDisabled>
      <resistor name="R1" resistance="1k" footprint="0402" />
    </board>,
  )
  const { server } = await fixture(json, {
    "tscircuit.config.json": '{ "ignoredFiles": ["checks", "dist"] }',
    "tscircuit.config.ts": "export default {}",
  })
  await server.start()
  expect(await uploaded(server)).toEqual(["src/index.tsx"])
})

test("no ignores upload the freshly rendered circuit unchanged", async () => {
  const json = await render(
    <board width={10} height={8} routingDisabled>
      <resistor name="R1" resistance="1k" footprint="0402" />
    </board>,
  )
  const { server } = await fixture(json)
  await server.start()
  expect(await uploaded(server)).toEqual([
    "checks/scratch.circuit.json",
    "dist/board.circuit.json",
    "src/index.tsx",
  ])
  const { file } = await server.fsKy
    .get("api/files/get", {
      searchParams: { file_path: "dist/board.circuit.json" },
    })
    .json()
  expect(JSON.parse(file!.text_content!)).toEqual(json)
})

test("explicit API ignores survive startup", async () => {
  const json = await render(
    <board width={10} height={8} routingDisabled>
      <resistor name="R1" resistance="1k" footprint="0402" />
    </board>,
  )
  const { server } = await fixture(json, {
    "tscircuit.config.json": '{ "ignoredFiles": ["src"] }',
    "tscircuit.config.ts":
      'export default { ignoredFiles: ["checks", "dist"] }',
  })
  expect(server.ignoredFiles).toEqual(["src"])
  server.ignoredFiles = ["src", "checks", "dist"]
  await server.start()
  expect(await uploaded(server)).toEqual([])
})

regression(
  "TS ignores exclude live circuit output from watch uploads",
  async () => {
    const json = await render(
      <board width={10} height={8} routingDisabled>
        <resistor name="R1" resistance="1k" footprint="0402" />
      </board>,
    )
    const { server, projectDir } = await fixture(json, {
      "tscircuit.config.ts":
        'export default { ignoredFiles: ["checks", "dist"] }',
    })
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
    await Bun.write(
      join(projectDir, "checks/scratch.circuit.json"),
      JSON.stringify(json),
    )
    await Bun.write(
      join(projectDir, "dist/new.circuit.json"),
      JSON.stringify(json),
    )
    await Bun.write(
      join(projectDir, "src/index.tsx"),
      `${source}\n// source edit\n`,
    )
    await changed
    for (let n = 0; n < 100 && !synced.includes("src/index.tsx"); n++)
      await Bun.sleep(10)
    // Await ignored handlers directly so exclusion does not depend on event timing.
    await server.handleFileChangedOnFilesystem(
      join(projectDir, "checks/scratch.circuit.json"),
    )
    await server.handleFileChangedOnFilesystem(
      join(projectDir, "dist/new.circuit.json"),
    )
    expect([...new Set(synced)].sort()).toEqual(["src/index.tsx"])
  },
)
