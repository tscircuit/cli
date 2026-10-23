import { expect, test } from "bun:test"
import { readFile, stat, symlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { runInNewContext } from "node:vm"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

const readCircuitFromHtml = (html: string) => {
  const window: Record<string, unknown> = {}
  runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)![1], { window })
  return window.CIRCUIT_JSON
}

for (const standalone of [false, true]) {
  test(`single HTML builds without network access or local site assets (standalone=${standalone})`, async () => {
    const { tmpDir } = await getCliTestFixture()
    const circuitJson = [
      {
        type: "schematic_text",
        text: '</script><script>alert("circuit")</script>',
      },
    ]
    await writeFile(
      path.join(tmpDir, "board.circuit.json"),
      JSON.stringify(circuitJson),
    )
    await writeFile(
      path.join(tmpDir, "package.json"),
      '{"name":"test/single-html"}',
    )
    const preload = path.join(tmpDir, "no-fetch.ts")
    await writeFile(
      preload,
      'globalThis.fetch = () => { throw new Error("Unexpected build-time network request") }',
    )
    const subprocess = Bun.spawn(
      [
        "bun",
        "--preload",
        preload,
        path.resolve("cli/main.ts"),
        "build",
        "board.circuit.json",
        "--site",
        "--single-html",
      ],
      {
        cwd: tmpDir,
        env: {
          ...process.env,
          TSCI_TEST_MODE: "true",
          TSCIRCUIT_CONFIG_DIR: path.join(tmpDir, ".config"),
          TSCIRCUIT_STANDALONE: standalone ? "1" : "0",
          TSCIRCUIT_JSCDN_DIR: path.join(tmpDir, "no-local-jscdn"),
        },
        stdout: "pipe",
        stderr: "pipe",
      },
    )
    const [, stderr, exitCode] = await Promise.all([
      new Response(subprocess.stdout).text(),
      new Response(subprocess.stderr).text(),
      subprocess.exited,
    ])
    expect(stderr).toBe("")
    expect(exitCode).toBe(0)
    const html = await readFile(path.join(tmpDir, "dist/index.html"), "utf8")
    expect(readCircuitFromHtml(html)).toEqual(circuitJson)
    expect(html).toContain("/dist/standalone-preview.min.js")
    expect(html).not.toContain("./board/circuit.json")
    expect(html).not.toContain('"./jscdn"')
    await expect(
      stat(path.join(tmpDir, "dist/standalone.min.js")),
    ).rejects.toBeTruthy()
    await expect(
      stat(path.join(tmpDir, "dist/board/3d.png")),
    ).rejects.toBeTruthy()
  }, 30_000)
}

for (const concurrency of [1, 2]) {
  test(`single HTML embeds compiled TSX with concurrency ${concurrency}`, async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    await writeFile(path.join(tmpDir, "package.json"), "{}")
    await symlink(
      path.resolve("node_modules"),
      path.join(tmpDir, "node_modules"),
    )
    await writeFile(
      path.join(tmpDir, "board.circuit.tsx"),
      `export default () => (
      <board width="10mm" height="10mm">
        <resistor resistance="1k" footprint="0402" name="R1" schX={3} pcbX={3} />
      </board>
    )`,
    )
    const { stderr, exitCode } = await runCommand(
      `tsci build board.circuit.tsx --site --single-html --concurrency ${concurrency}`,
    )
    expect(stderr).toBe("")
    expect(exitCode).toBe(0)
    const html = await readFile(path.join(tmpDir, "dist/index.html"), "utf8")
    const circuitJson = JSON.parse(
      await readFile(path.join(tmpDir, "dist/board/circuit.json"), "utf8"),
    )
    expect(circuitJson.some((item: any) => item.type === "pcb_board")).toBe(
      true,
    )
    expect(readCircuitFromHtml(html)).toEqual(circuitJson)
  }, 30_000)
}

for (const [options, error] of [
  ["--single-html", "--single-html requires --site"],
  [
    "--site --single-html --bundle-jscdn",
    "--single-html cannot be used with --bundle-jscdn",
  ],
  [
    "--site --single-html --jscdn-base-url ./jscdn",
    "--single-html requires an absolute HTTP(S) --jscdn-base-url",
  ],
]) {
  test(`rejects invalid single HTML options: ${options}`, async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    await writeFile(path.join(tmpDir, "board.circuit.json"), "[]")
    const { stderr, exitCode } = await runCommand(
      `tsci build board.circuit.json ${options}`,
    )
    expect(exitCode).toBe(1)
    expect(stderr).toContain(error)
    await expect(
      stat(path.join(tmpDir, "dist/index.html")),
    ).rejects.toBeTruthy()
  })
}

test("single HTML requires an explicit entry when there are multiple circuits", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await writeFile(path.join(tmpDir, "first.circuit.json"), "[]")
  await writeFile(path.join(tmpDir, "second.circuit.json"), "[]")
  const { stderr, exitCode } = await runCommand(
    "tsci build --site --single-html",
  )
  expect(exitCode).toBe(1)
  expect(stderr).toContain("--single-html requires exactly one circuit")
  await expect(stat(path.join(tmpDir, "dist/index.html"))).rejects.toBeTruthy()
})

test("single HTML reports unsupported custom tabs instead of discarding them", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await writeFile(path.join(tmpDir, "board.circuit.json"), "[]")
  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({
      extraRunFrameTabs: [
        { tabName: "Docs", iframeUrl: "https://example.com" },
      ],
    }),
  )
  const { stderr, exitCode } = await runCommand(
    "tsci build board.circuit.json --site --single-html",
  )
  expect(exitCode).toBe(1)
  expect(stderr).toContain("--single-html does not support extraRunFrameTabs")
})

test("failed circuits cannot produce an apparently successful single HTML site", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  await writeFile(path.join(tmpDir, "board.circuit.json"), "invalid JSON")
  const { exitCode } = await runCommand(
    "tsci build board.circuit.json --site --single-html",
  )
  expect(exitCode).toBe(1)
  await expect(stat(path.join(tmpDir, "dist/index.html"))).rejects.toBeTruthy()
})
