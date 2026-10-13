import { afterEach, expect, test } from "bun:test"
import { writeFile } from "node:fs/promises"
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

test("dev serves prepared JavaScript and WASM from TSCIRCUIT_JSCDN_DIR", async () => {
  const { tmpDir } = await getCliTestFixture()
  await writePreparedJscdn(tmpDir)
  process.env.TSCIRCUIT_JSCDN_DIR = tmpDir
  const port = await getPort()
  const { server } = await createHttpServer({ port })
  const origin = `http://localhost:${port}`
  try {
    const html = await fetch(origin).then((response) => response.text())
    expect(html).toContain('window.TSCIRCUIT_JSCDN_BASE_URL = "/jscdn";')
    const module = await fetch(
      `${origin}/jscdn/circuit-json-to-step/latest/+esm`,
    )
    expect(module.headers.get("content-type")).toBe("application/javascript")
    expect(await module.text()).toBe(
      preparedJscdnFiles["circuit-json-to-step/latest/+esm"],
    )
    const wasm = await fetch(`${origin}/jscdn/wasm/model.wasm`)
    expect(wasm.headers.get("content-type")).toBe("application/wasm")
    expect(new Uint8Array(await wasm.arrayBuffer())).toEqual(
      preparedJscdnFiles["wasm/model.wasm"],
    )
  } finally {
    server.close()
  }
})

test("explicit jscdnDir overrides the environment and only serves files inside that directory", async () => {
  const { tmpDir } = await getCliTestFixture()
  const source = path.join(tmpDir, "jscdn")
  await writePreparedJscdn(source)
  await writeFile(path.join(tmpDir, "outside.js"), "private")
  process.env.TSCIRCUIT_JSCDN_DIR = path.join(tmpDir, "unused")
  const port = await getPort()
  const { server } = await createHttpServer({ port, jscdnDir: source })
  const origin = `http://localhost:${port}`
  try {
    const module = await fetch(
      `${origin}/jscdn/@tscircuit/example/0.1.0/dist/browser.js`,
    )
    expect(await module.text()).toBe(
      preparedJscdnFiles["@tscircuit/example/0.1.0/dist/browser.js"],
    )
    expect((await fetch(`${origin}/jscdn/missing.js`)).status).toBe(404)
    expect((await fetch(`${origin}/jscdn/wasm/`)).status).toBe(404)
    expect((await fetch(`${origin}/jscdn/%2e%2e%2foutside.js`)).status).toBe(
      404,
    )
  } finally {
    server.close()
  }
})
