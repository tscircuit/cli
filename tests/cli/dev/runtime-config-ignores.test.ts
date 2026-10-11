import { expect, test } from "bun:test"
import { once } from "node:events"
import { mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { DevServer } from "cli/dev/DevServer"
import getPort from "get-port"
import type { KyInstance } from "ky"
import {
  loadProjectConfigSync,
  loadRuntimeProjectConfig,
} from "lib/project-config"
import { createHttpServer } from "lib/server/createHttpServer"
import { temporaryDirectory } from "tempy"

// Set this to expose the assertions as ordinary failures on the reproduction branch.
const regressionTest = process.env.TSCI_ASSERT_CONFIG_IGNORES
  ? test
  : test.failing
const ignoredFiles = ["checks", "dist"]
const moduleConfig = `export default {
  ignoredFiles: ["checks", "dist"],
  mainEntrypoint: "src/index.tsx",
  platformConfig: { localCacheEngine: {
    getItem: async (key) => key === "supplier" ? "cached-footprint" : null,
    setItem: async () => {},
  } },
}`
const cases: {
  name: string
  files: Record<string, string>
  regression?: boolean
  includeGenerated?: boolean
}[] = [
  {
    name: "JSON",
    files: { "tscircuit.config.json": JSON.stringify({ ignoredFiles }) },
  },
  {
    name: "TypeScript",
    files: { "tscircuit.config.ts": moduleConfig },
    regression: true,
  },
  {
    name: "JavaScript",
    files: { "tscircuit.config.js": moduleConfig },
    regression: true,
  },
  {
    name: "TypeScript overrides JSON",
    files: {
      "tscircuit.config.json": JSON.stringify({
        ignoredFiles: ["src"],
        mainEntrypoint: "json.tsx",
        build: { circuitJson: true },
      }),
      "tscircuit.config.ts": moduleConfig,
    },
    regression: true,
  },
  {
    name: "JSON ignores with runtime-only TypeScript",
    files: {
      "tscircuit.config.json": JSON.stringify({ ignoredFiles }),
      "tscircuit.config.ts": moduleConfig.replace(
        'ignoredFiles: ["checks", "dist"],',
        "",
      ),
    },
  },
  { name: "no config negative control", files: {}, includeGenerated: true },
]

async function fixture(files: Record<string, string>) {
  const projectDir = temporaryDirectory()
  const initialFiles = {
    "src/index.tsx": "export default () => <board />",
    "src/checks.txt": "source control",
    "checks/scratch.json": "[]",
    "dist/board.circuit.json": "[]",
    ...files,
  }
  for (const [file, content] of Object.entries(initialFiles)) {
    await mkdir(path.dirname(path.join(projectDir, file)), { recursive: true })
    await writeFile(path.join(projectDir, file), content)
  }
  const server = new DevServer({
    port: await getPort(),
    projectDir,
    componentFilePath: path.join(projectDir, "src/index.tsx"),
  })
  globalThis.deferredCleanupFns.push(async () => {
    await server.stop()
    await rm(projectDir, { recursive: true, force: true })
  })
  // The file-server bundle shares storage between HTTP server instances.
  // Clear it before starting event polling so fixtures cannot copy old files.
  server.httpServer = (await createHttpServer({ port: server.port })).server
  const { file_list } = await server.fsKy.get("api/files/list").json()
  for (const file of file_list) {
    await server.fsKy.post("api/files/delete", {
      json: { file_path: file.file_path, initiator: "filesystem_change" },
    })
  }
  await server.fsKy.post("api/events/reset", { json: {} })
  await new Promise<void>((resolve) =>
    server.httpServer!.close(() => resolve()),
  )
  return { server, projectDir, initialFiles }
}

for (const scenario of cases) {
  const run = scenario.regression ? regressionTest : test
  run(`initial upload honors ${scenario.name} ignores`, async () => {
    const { server, initialFiles } = await fixture(scenario.files)
    await server.start()
    const { file_list } = await server.fsKy.get("api/files/list").json()
    const actual = file_list.map((file) => file.file_path).sort()
    const expected = Object.keys(initialFiles)
      .filter(
        (file) =>
          scenario.includeGenerated ||
          (!file.startsWith("checks/") && !file.startsWith("dist/")),
      )
      .sort()
    console.log(
      JSON.stringify({
        scenario: scenario.name,
        phase: "initial upload",
        expected,
        actual,
      }),
    )
    expect(actual).toEqual(expected)
  })
}

test("runtime loader accepts module ignores and preserves JSON priority and supplier cache", async () => {
  const { projectDir } = await fixture(cases[3].files)
  const sync = loadProjectConfigSync(projectDir)
  expect(sync?.ignoredFiles).toEqual(["src"])
  expect(sync).not.toBeInstanceOf(Promise)
  const runtime = await loadRuntimeProjectConfig(projectDir)
  expect(runtime?.ignoredFiles).toEqual(ignoredFiles)
  expect(runtime?.mainEntrypoint).toBe("src/index.tsx")
  expect(runtime?.build?.circuitJson).toBe(true)
  expect(
    await runtime?.platformConfig?.localCacheEngine?.getItem("supplier"),
  ).toBe("cached-footprint")
})

test("DevServer keeps synchronous construction and explicit API ignore overrides", async () => {
  const { server } = await fixture(cases[3].files)
  expect(server).not.toBeInstanceOf(Promise)
  expect(server.ignoredFiles).toEqual(["src"])
  server.ignoredFiles = ["checks", "dist", "src"]
  await server.start()
  const { file_list } = await server.fsKy.get("api/files/list").json()
  expect(file_list.map((file) => file.file_path).sort()).toEqual([
    "tscircuit.config.json",
    "tscircuit.config.ts",
  ])
})

regressionTest(
  "watch events honor TypeScript ignores after startup",
  async () => {
    const { server, projectDir } = await fixture(cases[1].files)
    await server.start()
    const watcher = server.filesystemWatcher!
    if (!watcher.getWatched()[projectDir]) await once(watcher, "ready")
    // Observe real file-sync requests, including any generated-output leaks.
    const synced: string[] = []
    server.fsKy = (server.fsKy as unknown as KyInstance).extend({
      hooks: {
        beforeRequest: [
          async (request) => {
            if (new URL(request.url).pathname === "/api/files/upsert") {
              synced.push((await request.clone().json()).file_path)
            }
          },
        ],
      },
    }) as typeof server.fsKy
    const changed = once(watcher, "change")
    await writeFile(path.join(projectDir, "checks/scratch.json"), "[1]")
    await writeFile(path.join(projectDir, "dist/new.circuit.json"), "[2]")
    await writeFile(
      path.join(projectDir, "src/checks.txt"),
      "updated source control",
    )
    await changed
    for (
      let attempt = 0;
      attempt < 100 && !synced.includes("src/checks.txt");
      attempt++
    )
      await Bun.sleep(10)
    // Also exercise public handlers directly so the exclusion assertions do not
    // depend on waiting for an event that correctly never arrives.
    await server.handleFileChangedOnFilesystem(
      path.join(projectDir, "checks/scratch.json"),
    )
    await server.handleFileChangedOnFilesystem(
      path.join(projectDir, "dist/new.circuit.json"),
    )
    console.log(
      JSON.stringify({
        phase: "watch upload",
        expected: ["src/checks.txt"],
        actual: [...new Set(synced)].sort(),
      }),
    )
    expect(synced).toContain("src/checks.txt")
    expect([...new Set(synced)].sort()).toEqual(["src/checks.txt"])
  },
)
