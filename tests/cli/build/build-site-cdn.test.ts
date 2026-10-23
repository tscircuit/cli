import { expect, test } from "bun:test"
import { readFile, stat, symlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { runInNewContext } from "node:vm"
import { getCliTestFixture } from "tests/fixtures/get-cli-test-fixture"

const runFrameCdnPreload = path.resolve(
  "tests/fixtures/runframe-cdn-preload.ts",
)

const readCircuitFromHtml = async (html: string) => {
  const window: Record<string, unknown> = {}
  runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)![1], {
    window,
    URL,
    Blob,
  })
  const files = window.TSCIRCUIT_RUNFRAME_STATIC_FILE_LIST as Array<{
    fileStaticAssetUrl: string
  }>
  const url = files[0]!.fileStaticAssetUrl
  try {
    return await fetch(url).then((response) => response.json())
  } finally {
    URL.revokeObjectURL(url)
  }
}

for (const standalone of [false, true]) {
  test(`single-circuit CDN sites only fetch RunFrame metadata and embed JSON without local site assets (standalone=${standalone})`, async () => {
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
      '{"name":"test/cdn-site"}',
    )
    const preload = path.join(tmpDir, "no-fetch.ts")
    await writeFile(
      preload,
      `globalThis.fetch = (input) => {
        if (String(input) === "https://registry.npmjs.org/@tscircuit/runframe/latest") {
          return Promise.resolve(Response.json({ version: "0.0.9999" }))
        }
        throw new Error("Unexpected build-time network request")
      }`,
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
        "--use-cdn-javascript",
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
    expect(await readCircuitFromHtml(html)).toEqual(circuitJson)
    expect(html).toContain(
      "@tscircuit/runframe@0.0.9999/dist/standalone.min.js",
    )
    expect(html).toContain("URL.createObjectURL(new Blob(")
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
  test(`CDN sites embed compiled TSX with concurrency ${concurrency}`, async () => {
    const { tmpDir, runCommand } = await getCliTestFixture({
      preload: runFrameCdnPreload,
    })
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
      `tsci build board.circuit.tsx --site --use-cdn-javascript --concurrency ${concurrency}`,
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
    expect(await readCircuitFromHtml(html)).toEqual(circuitJson)
  }, 30_000)
}

test("CDN sites preserve configured custom tabs with embedded JSON", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({
    preload: runFrameCdnPreload,
  })
  const extraRunFrameTabs = [
    {
      tabName: "Docs",
      iframeUrl: "https://example.com",
      mainComponentPath: "board.circuit.json",
    },
  ]
  await writeFile(path.join(tmpDir, "board.circuit.json"), "[]")
  await writeFile(
    path.join(tmpDir, "tscircuit.config.json"),
    JSON.stringify({ extraRunFrameTabs }),
  )
  const { stderr, exitCode } = await runCommand(
    "tsci build board.circuit.json --site --use-cdn-javascript",
  )
  expect(stderr).toBe("")
  expect(exitCode).toBe(0)
  const html = await readFile(path.join(tmpDir, "dist/index.html"), "utf8")
  const window: Record<string, any> = {}
  runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)![1], {
    window,
    URL,
    Blob,
  })
  expect(window.TSCIRCUIT_EXTRA_RUNFRAME_TABS).toEqual(extraRunFrameTabs)
  const url = window.TSCIRCUIT_RUNFRAME_STATIC_FILE_LIST[0].fileStaticAssetUrl
  try {
    expect(await fetch(url).then((r) => r.json())).toEqual([])
  } finally {
    URL.revokeObjectURL(url)
  }
}, 30_000)

test("single-circuit CDN sites still honor explicit preview image options", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture({
    preload: runFrameCdnPreload,
  })
  await writeFile(path.join(tmpDir, "board.circuit.json"), "[]")
  const { stderr, exitCode } = await runCommand(
    "tsci build board.circuit.json --site --use-cdn-javascript --3d-png",
  )
  expect(stderr).toBe("")
  expect(exitCode).toBe(0)
  const png = await readFile(path.join(tmpDir, "dist/board/3d.png"))
  expect(png.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]))
}, 30_000)
