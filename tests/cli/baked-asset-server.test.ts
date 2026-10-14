import { afterEach, expect, test } from "bun:test"
import { mkdir, symlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { runInNewContext } from "node:vm"
import getPort from "get-port"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

const originalDir = process.env.TSCIRCUIT_BAKED_ASSET_SERVER_DIR
afterEach(() => {
  if (originalDir === undefined)
    delete process.env.TSCIRCUIT_BAKED_ASSET_SERVER_DIR
  else process.env.TSCIRCUIT_BAKED_ASSET_SERVER_DIR = originalDir
})

const writeBakedAssets = async (directory: string) => {
  for (const provider of ["jlcsearch", "digikey", "mouser"]) {
    const endpoint = path.join(directory, provider, "api/search")
    await mkdir(endpoint, { recursive: true })
    for (const partNumber of ["LM358", "NE555"]) {
      await writeFile(
        path.join(endpoint, `limit%3D10%26q%3D${partNumber}.json`),
        JSON.stringify({
          components: [{ mfr: partNumber, lcsc: 1234, stock: 10 }],
        }),
      )
    }
  }
}

test("search uses baked responses for all three providers and exits normally", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const directory = path.join(tmpDir, "baked")
  await writeBakedAssets(directory)
  process.env.TSCIRCUIT_BAKED_ASSET_SERVER_DIR = directory
  for (const partNumber of ["LM358", "NE555"]) {
    const { stdout, stderr, exitCode } = await runCommand(
      `tsci search --jlcpcb --digikey --mouser --json ${partNumber}`,
    )
    expect(exitCode).toBe(0)
    expect(stderr).toBe("")
    const { results } = JSON.parse(stdout)
    expect(
      results.map((part: { source: string }) => part.source).sort(),
    ).toEqual(["digikey", "jlcpcb", "mouser"])
    expect(
      results.every((part: { mfr: string }) => part.mfr === partNumber),
    ).toBe(true)
  }
  await writeFile(
    path.join(directory, "jlcsearch/api/search/limit%3D10%26q%3Dmissing.json"),
    JSON.stringify({ components: [] }),
  )
  const imported = await runCommand("tsci import missing")
  expect(imported.exitCode).toBe(0)
  expect(imported.stdout).toContain('No results found for "missing"')
  expect((await runCommand("tsci version")).exitCode).toBe(0)
}, 20_000)

test("dev injects the provider URLs and serves baked files across origins", async () => {
  const { tmpDir, startCommand } = await getCliTestFixture()
  const directory = path.join(tmpDir, "baked")
  await writeBakedAssets(directory)
  await writeFile(path.join(directory, "asset.bin"), "baked asset")
  const privateFile = path.join(tmpDir, "private.json")
  await writeFile(privateFile, "private")
  await symlink(privateFile, path.join(directory, "private.json"))
  await writeFile(
    path.join(tmpDir, "index.tsx"),
    "export default () => <board />",
  )
  process.env.TSCIRCUIT_BAKED_ASSET_SERVER_DIR = directory
  const port = await getPort()
  const command = startCommand(`tsci dev index.tsx --port ${port}`)
  const origin = `http://localhost:${port}`
  let html = ""
  const deadline = Date.now() + 10_000
  while (!html && Date.now() < deadline) {
    try {
      html = await fetch(origin, {
        signal: AbortSignal.timeout(500),
      }).then((response) => response.text())
    } catch {
      await Bun.sleep(100)
    }
  }
  const browser = { window: {} as Record<string, string> }
  const startupScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1]
  expect(startupScript).toBeDefined()
  runInNewContext(startupScript!, browser)
  const jlcUrl = browser.window.TSCIRCUIT_JLCSEARCH_BASE_URL!
  const assetOrigin = new URL(jlcUrl).origin
  expect(assetOrigin).not.toBe(origin)
  for (const [name, provider] of [
    ["JLCSEARCH", "jlcsearch"],
    ["DIGIKEY", "digikey"],
    ["MOUSER", "mouser"],
    ["DATASHEET_API", "datasheet-api"],
  ]) {
    expect(browser.window[`TSCIRCUIT_${name}_BASE_URL`]).toBe(
      `${assetOrigin}/${provider}`,
    )
  }
  expect(html.indexOf("Object.assign(window,")).toBeLessThan(
    html.indexOf('src="/standalone.min.js"'),
  )
  const response = await fetch(`${jlcUrl}/api/search?q=LM358&limit=10`)
  expect(response.headers.get("access-control-allow-origin")).toBe("*")
  expect(response.headers.get("content-type")).toBe("application/json")
  expect((await response.json()).components[0].mfr).toBe("LM358")
  expect(
    await fetch(`${assetOrigin}/asset.bin`).then((res) => res.text()),
  ).toBe("baked asset")
  for (const endpoint of [
    "missing.json",
    "%2e%2e%2fprivate.json",
    "private.json",
  ]) {
    expect((await fetch(`${assetOrigin}/${endpoint}`)).status).toBe(404)
  }
  expect((await fetch(jlcUrl, { method: "POST" })).status).toBe(405)
  expect((await fetch(jlcUrl, { method: "OPTIONS" })).status).toBe(204)
  expect(command.exitCode).toBeNull()
}, 20_000)
