import { afterEach, expect, test } from "bun:test"
import { readFile, stat, symlink, writeFile } from "node:fs/promises"
import path from "node:path"
import getPort from "get-port"
import { createHttpServer } from "lib/server/createHttpServer"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"
import {
  preparedJscdnFiles,
  writePreparedJscdn,
} from "tests/fixtures/prepared-jscdn"

const originalDir = process.env.TSCIRCUIT_JSCDN_DIR
afterEach(() => {
  if (originalDir === undefined) delete process.env.TSCIRCUIT_JSCDN_DIR
  else process.env.TSCIRCUIT_JSCDN_DIR = originalDir
})

const startJscdnServer = async (jscdnDir?: string) => {
  const { server } = await createHttpServer({ port: 0, jscdnDir })
  globalThis.deferredCleanupFns.push(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  )
  const address = server.address()
  if (!address || typeof address === "string")
    throw new Error("Expected TCP server")
  return `http://localhost:${address.port}`
}

test("dev serves prepared modules and WASM from the environment directory and configures runframe", async () => {
  const { tmpDir } = await getCliTestFixture()
  const source = path.join(tmpDir, "prepared-jscdn")
  await writePreparedJscdn(source)
  process.env.TSCIRCUIT_JSCDN_DIR = source
  const origin = await startJscdnServer()
  const html = await fetch(origin).then((response) => response.text())
  expect(html).toContain('window.TSCIRCUIT_JSCDN_BASE_URL = "/jscdn";')
  expect(html.indexOf("TSCIRCUIT_JSCDN_BASE_URL")).toBeLessThan(
    html.indexOf('src="/standalone.min.js"'),
  )
  for (const [file, content] of Object.entries(preparedJscdnFiles)) {
    const response = await fetch(`${origin}/jscdn/${file}`)
    expect(response.status).toBe(200)
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      typeof content === "string" ? new TextEncoder().encode(content) : content,
    )
    expect(response.headers.get("content-type")).toContain(
      file.endsWith(".wasm") ? "application/wasm" : "application/javascript",
    )
  }
  const head = await fetch(`${origin}/jscdn/circuit-json-to-step/latest/+esm`, {
    method: "HEAD",
  })
  expect(head.status).toBe(200)
  expect(await head.text()).toBe("")
  expect(Number(head.headers.get("content-length"))).toBeGreaterThan(0)
  await expect(stat(path.join(tmpDir, "dist"))).rejects.toBeTruthy()
})

test("dev restricts JS CDN routes to regular files inside the configured directory", async () => {
  const { tmpDir } = await getCliTestFixture()
  const source = path.join(tmpDir, "prepared-jscdn")
  await writePreparedJscdn(source)
  const secret = path.join(tmpDir, "secret.js")
  await writeFile(secret, "private")
  await symlink(secret, path.join(source, "escaped.js"))
  const origin = await startJscdnServer(source)
  for (const file of [
    "missing.js",
    "wasm/",
    "%2e%2e%2fsecret.js",
    "escaped.js",
  ]) {
    expect((await fetch(`${origin}/jscdn/${file}`)).status).toBe(404)
  }
  expect((await fetch(`${origin}/jscdn/%ZZ`)).status).toBe(400)
  expect((await fetch(`${origin}/jscdn/%00`)).status).toBe(400)
  expect(
    (await fetch(`${origin}/jscdn/_modules/shared.js`, { method: "POST" }))
      .status,
  ).toBe(405)
})

test("unconfigured dev does not set the local CDN URL and invalid directories fail on startup", async () => {
  const { tmpDir } = await getCliTestFixture()
  delete process.env.TSCIRCUIT_JSCDN_DIR
  const origin = await startJscdnServer()
  expect(await fetch(origin).then((response) => response.text())).not.toContain(
    "TSCIRCUIT_JSCDN_BASE_URL",
  )
  expect((await fetch(`${origin}/jscdn/missing.js`)).status).toBe(404)
  await expect(
    createHttpServer({ port: 0, jscdnDir: path.join(tmpDir, "missing") }),
  ).rejects.toThrow("not a directory")
})

test("tsci dev --jscdn-dir serves a relative directory and overrides the environment", async () => {
  const { tmpDir } = await getCliTestFixture()
  const source = path.join(tmpDir, "prepared-jscdn")
  await writePreparedJscdn(source)
  await writeFile(
    path.join(tmpDir, "index.tsx"),
    'export default () => <board width="10mm" height="10mm" />\n',
  )
  await writeFile(path.join(tmpDir, "package.json"), "{}")
  const port = await getPort()
  const subprocess = Bun.spawn(
    [
      "bun",
      path.resolve("cli/main.ts"),
      "dev",
      "index.tsx",
      "--port",
      String(port),
      "--jscdn-dir",
      "./prepared-jscdn",
    ],
    {
      cwd: tmpDir,
      env: {
        ...process.env,
        TSCI_TEST_MODE: "true",
        TSCIRCUIT_CONFIG_DIR: path.join(tmpDir, ".config"),
        TSCIRCUIT_JSCDN_DIR: path.join(tmpDir, "invalid-env-dir"),
      },
      stdout: "ignore",
      stderr: "ignore",
    },
  )
  const url = `http://localhost:${port}/jscdn/circuit-json-to-step/latest/+esm`
  try {
    let response: Response | undefined
    const deadline = Date.now() + 15_000
    while (Date.now() < deadline) {
      try {
        response = await fetch(url, {
          signal: AbortSignal.timeout(500),
          headers: { Connection: "close" },
        })
        if (response.ok) break
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    expect(response?.status).toBe(200)
    expect(await response?.text()).toBe(
      await readFile(
        path.join(source, "circuit-json-to-step/latest/+esm"),
        "utf8",
      ),
    )
  } finally {
    subprocess.kill("SIGKILL")
    await subprocess.exited
  }
}, 30_000)
