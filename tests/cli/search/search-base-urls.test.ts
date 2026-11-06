import { expect, test } from "bun:test"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

test("search calls configured HTTP APIs even with a separate baked asset server", async () => {
  const requests: string[] = []
  const component = {
    lcsc: 123,
    mfr: "TPS63001",
    package: "VSON",
    description: "Converter",
    stock: null,
    price: null,
  }
  const service = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(request) {
      const url = new URL(request.url)
      requests.push(url.pathname)
      if (url.pathname === "/registry/packages/search") {
        expect(request.method).toBe("POST")
        expect(await request.json()).toEqual({ query: "TPS63001" })
        return Response.json({
          packages: [{ name: "test/TPS63001", version: "1" }],
        })
      }
      if (url.pathname === "/sheets/datasheets/list")
        return Response.json({
          datasheets: [{ chip_name: "TPS63001", datasheet_id: "tps" }],
        })
      if (url.pathname === "/footprints/kicad_files.json")
        return Response.json(["Package.pretty/TPS63001.kicad_mod"])
      if (/^\/(jlc|dk|mouser|ti)\/api\/search$/.test(url.pathname)) {
        expect(url.searchParams.get("q")).toBe("TPS63001")
        expect(url.searchParams.get("limit")).toBe("10")
        return Response.json({ components: [component] })
      }
      return new Response("Unexpected request", { status: 404 })
    },
  })
  try {
    const origin = service.url.origin
    const env = {
      TSCIRCUIT_JLCSEARCH_BASE_URL: `${origin}/jlc/`,
      TSCIRCUIT_DIGIKEY_BASE_URL: `${origin}/dk`,
      TSCIRCUIT_MOUSER_BASE_URL: `${origin}/mouser`,
      TSCIRCUIT_TI_BASE_URL: `${origin}/ti`,
      TSCIRCUIT_KICAD_BASE_URL: `${origin}/footprints`,
      TSCIRCUIT_DATASHEET_API_BASE_URL: `${origin}/sheets`,
      TSCIRCUIT_REGISTRY_API_URL: `${origin}/registry`,
      TSCIRCUIT_DEFAULT_SEARCH_SOURCES:
        "kicad,jlcpcb,ti,digikey,mouser,tscircuit,datasheets",
      TSCIRCUIT_BAKED_ASSET_SERVER_DIR: "",
    }
    const { tmpDir, runCommand } = await getCliTestFixture({ env })
    env.TSCIRCUIT_BAKED_ASSET_SERVER_DIR = path.join(
      tmpDir,
      "empty-baked-assets",
    )
    await mkdir(env.TSCIRCUIT_BAKED_ASSET_SERVER_DIR)
    const { stdout, stderr, exitCode } = await runCommand(
      "tsci search TPS63001 --json",
    )
    expect(stderr).toBe("")
    expect(exitCode).toBe(0)
    const result = JSON.parse(stdout)
    expect(result.errors).toBeUndefined()
    expect(result.results).toHaveLength(7)
    expect(requests.sort()).toEqual([
      "/dk/api/search",
      "/footprints/kicad_files.json",
      "/jlc/api/search",
      "/mouser/api/search",
      "/registry/packages/search",
      "/sheets/datasheets/list",
      "/ti/api/search",
    ])
    const text = await runCommand("tsci search TPS63001 --jlcpcb")
    expect(text.exitCode).toBe(0)
    expect(text.stdout).toContain("stock: unknown")
  } finally {
    service.stop(true)
  }
}, 20_000)
