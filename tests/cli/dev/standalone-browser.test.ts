import { afterEach, expect, test } from "bun:test"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { runInNewContext } from "node:vm"
import getPort from "get-port"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"
import evalPackage from "@tscircuit/eval/package.json"

const environmentVariables = [
  "TSCIRCUIT_STANDALONE",
  "TSCIRCUIT_GLOBAL_STANDALONE_FILE_PATH",
  "RUNFRAME_STANDALONE_FILE_PATH",
] as const
const originalEnvironment = environmentVariables.map(
  (name) => process.env[name],
)
afterEach(() => {
  environmentVariables.forEach((name, index) => {
    if (originalEnvironment[index] === undefined) delete process.env[name]
    else process.env[name] = originalEnvironment[index]
  })
})

for (const standalone of [false, true]) {
  test(`${standalone ? "standalone" : "normal"} dev uses the expected browser configuration and UI bundle`, async () => {
    const { tmpDir, startCommand } = await getCliTestFixture()
    await writeFile(
      path.join(tmpDir, "index.tsx"),
      "export default () => <board />",
    )
    const localPackage = path.join(tmpDir, "node_modules/tscircuit")
    await mkdir(localPackage, { recursive: true })
    await writeFile(
      path.join(localPackage, "package.json"),
      JSON.stringify({
        name: "tscircuit",
        exports: { "./browser": "./browser.js" },
      }),
    )
    await writeFile(path.join(localPackage, "browser.js"), "PROJECT_BUNDLE")
    const override = path.join(tmpDir, "override.js")
    await writeFile(override, "OVERRIDE_BUNDLE")
    const version = evalPackage.version
    process.env.TSCIRCUIT_STANDALONE = standalone ? "1" : "0"
    process.env.TSCIRCUIT_GLOBAL_STANDALONE_FILE_PATH = override
    process.env.RUNFRAME_STANDALONE_FILE_PATH = override
    const port = await getPort()
    startCommand(`tsci dev index.tsx --port ${port}`)
    const origin = `http://localhost:${port}`
    let html = ""
    const deadline = Date.now() + 15_000
    while (!html && Date.now() < deadline) {
      try {
        html = await fetch(origin, { signal: AbortSignal.timeout(500) }).then(
          (res) => res.text(),
        )
      } catch {
        await Bun.sleep(100)
      }
    }
    expect(html).toContain('src="/standalone.min.js"')
    const browser = { window: {} as Record<string, unknown> }
    runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)![1], browser)
    const bundle = await fetch(`${origin}/standalone.min.js`).then((res) =>
      res.text(),
    )
    expect(browser.window.TSCIRCUIT_EVAL_WORKER_URL).toBeUndefined()
    if (standalone) {
      expect(browser.window.TSCIRCUIT_LATEST_EVAL_VERSION).toBe(version)
      expect(browser.window.TSCIRCUIT_ALLOW_SELECTING_EVAL_VERSION).toBe(false)
      expect(browser.window.TSCIRCUIT_TELEMETRY_DISABLED).toBe(true)
      expect(html).not.toContain("https://cdn.tailwindcss.com")
      expect(html).not.toContain("https://github.com/tscircuit.png")
      expect(bundle).toContain("TSCIRCUIT_USE_RUNFRAME_FOR_CLI")
    } else {
      expect(browser.window.TSCIRCUIT_LATEST_EVAL_VERSION).toBeUndefined()
      expect(browser.window.TSCIRCUIT_TELEMETRY_DISABLED).toBeUndefined()
      expect(html).toContain("https://cdn.tailwindcss.com")
      expect(bundle).toBe("OVERRIDE_BUNDLE")
    }
  }, 30_000)
}
