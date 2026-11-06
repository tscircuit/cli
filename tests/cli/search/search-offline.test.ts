import { expect, test } from "bun:test"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

test("file-backed search uses no HTTP for matches, misses, or source overrides", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tsci-offline-search-"))
  try {
    const catalog = join(directory, "datasheet-api", "datasheets")
    await mkdir(catalog, { recursive: true })
    const part = { chip_name: "RP2040", datasheet_id: "rp2040" }
    await writeFile(
      join(catalog, "list"),
      JSON.stringify({ datasheets: [part] }),
    )
    const supplier = join(directory, "jlcsearch", "api", "search")
    await mkdir(supplier, { recursive: true })
    await writeFile(
      join(supplier, "limit%3D10%26q%3Drp2040.json"),
      JSON.stringify({ components: [{ mfr: "RP2040", lcsc: 2040 }] }),
    )
    const preload = join(directory, "deny-network.mjs")
    await writeFile(
      preload,
      `import { Server, Socket } from "node:net"
const denyNetwork = () => { console.error("Unexpected network access"); process.exit(88) }
globalThis.fetch = Server.prototype.listen = Socket.prototype.connect = denyNetwork
`,
    )

    const search = (...args: string[]) =>
      Bun.spawnSync(
        [
          process.execPath,
          "run",
          "--preload",
          preload,
          resolve("cli/main.ts"),
          "search",
          ...args,
        ],
        {
          cwd: directory,
          env: {
            ...process.env,
            FORCE_COLOR: "0",
            TSCIRCUIT_CONFIG_DIR: directory,
            TSCIRCUIT_PLATFORM_BASE_URL: pathToFileURL(directory).href,
            TSCIRCUIT_DEFAULT_SEARCH_SOURCES: "datasheets",
          },
        },
      )

    const found = search("rp2040", "--json")
    expect(found.exitCode, found.stderr.toString()).toBe(0)
    expect(JSON.parse(found.stdout.toString())).toEqual({
      query: "rp2040",
      results: [{ source: "datasheets", ...part }],
    })
    const missing = search("tps63001", "--json")
    expect(missing.exitCode, missing.stderr.toString()).toBe(0)
    expect(JSON.parse(missing.stdout.toString()).results).toEqual([])

    const unavailable = search("--ti", "--kicad", "--tscircuit", "rp2040")
    expect(unavailable.exitCode).toBe(1)
    expect(unavailable.stderr.toString()).toContain(
      "Resource is not available from the configured platform source",
    )

    const bundledSupplier = search("--lcsc", "rp2040", "--json")
    expect(bundledSupplier.exitCode, bundledSupplier.stderr.toString()).toBe(0)
    expect(JSON.parse(bundledSupplier.stdout.toString()).results).toEqual([
      { source: "jlcpcb", mfr: "RP2040", lcsc: 2040 },
    ])

    // Source support is data-driven; the CLI has no local-source allowlist.
    const ti = join(directory, "tisearch.tscircuit.com", "api", "search")
    await mkdir(ti, { recursive: true })
    await writeFile(
      join(ti, "limit%3D10%26q%3Drp2040.json"),
      JSON.stringify({ components: [{ mfr: "RP2040", stock: 1 }] }),
    )
    const localTi = search("--ti", "rp2040", "--json")
    expect(localTi.exitCode, localTi.stderr.toString()).toBe(0)
    expect(JSON.parse(localTi.stdout.toString()).results).toEqual([
      { source: "ti", mfr: "RP2040", stock: 1 },
    ])

    const unbundledSupplier = search("--jlcpcb", "tps63001")
    expect(unbundledSupplier.exitCode).toBe(1)
    expect(unbundledSupplier.stderr.toString()).toContain(
      "Resource is not available from the configured platform source",
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 20_000)
