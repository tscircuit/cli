import { expect, test } from "bun:test"
import { once } from "node:events"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { DevServer } from "cli/dev/DevServer"
import getPort from "get-port"
import type { KyInstance } from "ky"
import { createHttpServer } from "lib/server/createHttpServer"
import { temporaryDirectory } from "tempy"
import { RootCircuit } from "tscircuit"

const regression = process.env.TSCI_ASSERT_CONFIG_IGNORES ? test : test.failing
const ignoredFiles = ["checks", "dist"]

async function fixture(mode: string, files: Record<string, string>) {
  const projectDir = temporaryDirectory()
  for (const [file, content] of Object.entries(files))
    await Bun.write(join(projectDir, file), content)
  if (mode !== "none") {
    const config = JSON.stringify({ ignoredFiles })
    const extension = ["mixed", "fallback", "override"].includes(mode)
      ? "ts"
      : mode
    await Bun.write(
      join(projectDir, `tscircuit.config.${extension}`),
      mode === "json"
        ? config
        : `export default ${mode === "fallback" ? "{}" : config}`,
    )
    if (["mixed", "fallback", "override"].includes(mode))
      await Bun.write(
        join(projectDir, "tscircuit.config.json"),
        JSON.stringify({
          ignoredFiles: mode === "fallback" ? ignoredFiles : ["src"],
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

regression("dev sync honors runtime config for live TSX output", async () => {
  const circuit = new RootCircuit()
  circuit.add(
    <board width={10} height={8} routingDisabled>
      <resistor name="R1" resistance="1k" footprint="0402" />
    </board>,
  )
  await circuit.renderUntilSettled()
  const json = circuit.getCircuitJson()
  expect(
    json.some(
      (element) => element.type === "source_component" && element.name === "R1",
    ),
  ).toBe(true)
  const files = {
    "src/index.tsx":
      'export default () => <board width={10} height={8} routingDisabled><resistor name="R1" resistance="1k" footprint="0402" /></board>',
    "checks/scratch.circuit.json": JSON.stringify(json),
    "dist/board.circuit.json": JSON.stringify(json),
  }
  if (process.env.TSCI_CONFIG_RENDER_PATH)
    await Bun.write(
      process.env.TSCI_CONFIG_RENDER_PATH,
      convertCircuitJsonToSchematicSvg(json, {
        colorOverrides: { schematic: { background: "#fff" } },
      }),
    )
  const actual: Record<string, string[]> = {}
  const modes = ["json", "ts", "js", "mixed", "fallback", "none", "override"]
  const expected = Object.fromEntries(
    [...modes, "watch"].map((mode) => [
      mode,
      mode === "none"
        ? Object.keys(files).sort()
        : mode === "override"
          ? []
          : ["src/index.tsx"],
    ]),
  )
  for (const mode of modes) {
    const { server, projectDir } = await fixture(mode, files)
    try {
      if (mode === "override") {
        expect(server.ignoredFiles).toEqual(["src"])
        server.ignoredFiles = ["src", ...ignoredFiles]
      }
      await server.start()
      const { file_list } = await server.fsKy.get("api/files/list").json()
      actual[mode] = file_list
        .map((file) => file.file_path)
        .filter((file) => file in files)
        .sort()
      if (["json", "fallback", "none", "override"].includes(mode))
        expect(actual[mode]).toEqual(expected[mode])
      if (mode === "none") {
        const { file } = await server.fsKy
          .get("api/files/get", {
            searchParams: { file_path: "dist/board.circuit.json" },
          })
          .json()
        expect(JSON.parse(file!.text_content!)).toEqual(json)
      }
      if (mode !== "ts") continue
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
      ])
        await Bun.write(
          join(projectDir, file),
          file.endsWith("tsx")
            ? `${files["src/index.tsx"]}\n// source edit\n`
            : JSON.stringify(json),
        )
      await changed
      for (let n = 0; n < 100 && !synced.includes("src/index.tsx"); n++)
        await Bun.sleep(10)
      // Await ignored handlers directly so exclusion does not depend on event timing.
      for (const file of [
        "checks/scratch.circuit.json",
        "dist/new.circuit.json",
      ])
        await server.handleFileChangedOnFilesystem(join(projectDir, file))
      actual.watch = [...new Set(synced)].sort()
    } finally {
      await server.stop()
    }
  }
  expect(actual).toEqual(expected)
})
