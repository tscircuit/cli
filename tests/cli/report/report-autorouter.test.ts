import { expect, test } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { getCliConfig } from "lib/cli-config"
import { readSimpleRouteJson } from "cli/report/autorouter/register"

const runCli = async ({
  args,
  cwd,
  configDir,
}: {
  args: string[]
  cwd: string
  configDir: string
}) => {
  const process = Bun.spawn(["bun", path.resolve("cli/main.ts"), ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...globalThis.process.env,
      FORCE_COLOR: "0",
      TSCIRCUIT_CONFIG_DIR: configDir,
    },
  })

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ])

  return { stdout, stderr, exitCode }
}

test("report autorouter uploads Simple Route JSON and prints its URL", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tsci-report-"))
  const configDir = path.join(tmpDir, ".config")
  const simpleRouteJson = {
    layerCount: 2,
    minTraceWidth: 0.15,
    bounds: { minX: -10, maxX: 10, minY: -5, maxY: 5 },
    connections: [
      {
        name: "VCC",
        pointsToConnect: [
          { x: -1, y: 0, layer: "top" },
          { x: 1, y: 0, layer: "top" },
        ],
      },
    ],
    obstacles: [
      {
        type: "rect",
        layers: ["top"],
        center: { x: 1, y: 2 },
        width: 1,
        height: 1,
        connectedTo: [],
      },
    ],
  }
  let receivedRequest:
    | { authorization: string | null; body: Record<string, unknown> }
    | undefined
  const server = Bun.serve({
    port: 0,
    async fetch(request) {
      receivedRequest = {
        authorization: request.headers.get("authorization"),
        body: (await request.json()) as Record<string, unknown>,
      }
      return Response.json({
        ok: true,
        autorouting_bug_report: {
          autorouting_bug_report_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        },
      })
    },
  })

  try {
    const config = getCliConfig({ configDir })
    config.set("registryApiUrl", `http://localhost:${server.port}`)
    config.set("sessionToken", "test-session-token")

    const inputPath = path.join(tmpDir, "phase-0.input.simple-route.json")
    fs.writeFileSync(inputPath, JSON.stringify(simpleRouteJson))

    const result = await runCli({
      args: [
        "report",
        "autorouter",
        inputPath,
        "--title",
        "USB routing failure",
        "--yes",
      ],
      cwd: tmpDir,
      configDir,
    })

    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain("Autorouter bug report created:")
    expect(result.stdout).toContain(
      "https://api.tscircuit.com/autorouting/bug_reports/view?autorouting_bug_report_id=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    )
    expect(receivedRequest).toEqual({
      authorization: "Bearer test-session-token",
      body: {
        title: "USB routing failure",
        simple_route_json: simpleRouteJson,
      },
    })
  } finally {
    server.stop()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
})

test("report autorouter requires --yes when run non-interactively", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tsci-report-"))
  const configDir = path.join(tmpDir, ".config")
  let requestCount = 0
  const server = Bun.serve({
    port: 0,
    fetch() {
      requestCount += 1
      return Response.json({ ok: true })
    },
  })

  try {
    const config = getCliConfig({ configDir })
    config.set("registryApiUrl", `http://localhost:${server.port}`)
    config.set("sessionToken", "test-session-token")

    const inputPath = path.join(tmpDir, "phase-0.input.simple-route.json")
    fs.writeFileSync(
      inputPath,
      JSON.stringify({
        layerCount: 2,
        minTraceWidth: 0.15,
        bounds: { minX: -10, maxX: 10, minY: -5, maxY: 5 },
        connections: [],
        obstacles: [],
      }),
    )

    const result = await runCli({
      args: ["report", "autorouter", inputPath],
      cwd: tmpDir,
      configDir,
    })

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain("Autorouter bug reports are public")
    expect(result.stderr).toContain("Re-run with --yes")
    expect(requestCount).toBe(0)
  } finally {
    server.stop()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
})

test("report autorouter gives login guidance without echoing the request", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tsci-report-"))
  const configDir = path.join(tmpDir, ".config")
  const server = Bun.serve({
    port: 0,
    fetch() {
      return Response.json(
        {
          error: {
            error_code: "unauthorized",
            message: "Invalid session token",
          },
        },
        { status: 401 },
      )
    },
  })

  try {
    const config = getCliConfig({ configDir })
    config.set("registryApiUrl", `http://localhost:${server.port}`)
    config.set("sessionToken", "expired-session-token")

    const inputPath = path.join(tmpDir, "phase-0.input.simple-route.json")
    fs.writeFileSync(
      inputPath,
      JSON.stringify({
        layerCount: 2,
        minTraceWidth: 0.15,
        bounds: { minX: -10, maxX: 10, minY: -5, maxY: 5 },
        connections: [{ name: "PRIVATE_NET_NAME" }],
        obstacles: [],
      }),
    )

    const result = await runCli({
      args: ["report", "autorouter", inputPath, "--yes"],
      cwd: tmpDir,
      configDir,
    })

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain("Run `tsci login` and try again")
    expect(result.stderr).not.toContain("PRIVATE_NET_NAME")
  } finally {
    server.stop()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
})

test("readSimpleRouteJson rejects malformed and unrelated JSON", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tsci-report-"))

  try {
    const malformedPath = path.join(tmpDir, "malformed.json")
    fs.writeFileSync(malformedPath, "{")
    expect(() => readSimpleRouteJson(malformedPath)).toThrow(
      "Could not parse Simple Route JSON file",
    )

    const unrelatedPath = path.join(tmpDir, "board.meta.json")
    fs.writeFileSync(unrelatedPath, JSON.stringify({ type: "debug_summary" }))
    expect(() => readSimpleRouteJson(unrelatedPath)).toThrow(
      "is not a Simple Route JSON input",
    )

    const incompletePath = path.join(tmpDir, "incomplete.json")
    fs.writeFileSync(
      incompletePath,
      JSON.stringify({ connections: [], obstacles: [] }),
    )
    expect(() => readSimpleRouteJson(incompletePath)).toThrow(
      "is not a Simple Route JSON input",
    )
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
})
