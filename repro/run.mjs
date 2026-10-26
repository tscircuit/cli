import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { once } from "node:events"
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { gunzipSync } from "node:zlib"

const here = dirname(fileURLToPath(import.meta.url))

// Run the published DevServer's actual initial-file path; no browser/watch loop.
if (process.argv[2] === "--dev-worker") {
  const [, , , cliRoot, projectDir, port] = process.argv
  const { DevServer } = await import(
    pathToFileURL(join(cliRoot, "dist/lib/index.js")).href
  )
  const dev = new DevServer({
    port: Number(port),
    projectDir,
    componentFilePath: join(projectDir, "index.circuit.tsx"),
  })
  await dev.upsertInitialFiles()
  process.exit(0)
}

const [cliArg, bunArg = "bun"] = process.argv.slice(2)
assert(
  cliArg,
  "Usage: node repro/run.mjs <published-cli-package-root> [bun-path]",
)
const cliRoot = resolve(cliArg)
const bun = bunArg.includes("/") ? resolve(bunArg) : bunArg
const { version } = JSON.parse(await readFile(join(cliRoot, "package.json")))
const scratch = await mkdtemp(join(tmpdir(), "tsci-ignored-files-"))
const results = []
let active
const server = createServer(async (req, res) => {
  try {
    assert.equal(req.method, "POST")
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const body = JSON.parse(Buffer.concat(chunks).toString() || "{}")
    active.requests.push(req.url)
    let response = {}
    switch (req.url) {
      case "/package_releases/list":
        response = { package_releases: [] }
        break
      case "/packages/get":
        response = { package: { name: "repro-user/ignored-files-repro" } }
        break
      case "/package_releases/get":
        res.statusCode = 404
        response = { error: { error_code: "package_release_not_found" } }
        break
      case "/package_releases/create":
      case "/package_releases/update":
      case "/api/events/reset":
      case "/api/events/create":
        break
      case "/package_files/upload_archive":
        active.files.push(
          ...JSON.parse(
            gunzipSync(Buffer.from(body.archive_base64, "base64")).toString(),
          ).files,
        )
        break
      case "/package_files/create":
        active.files.push(body)
        break
      case "/api/files/upsert":
        active.files.push(body)
        break
      default:
        throw new Error(`Unexpected request: ${req.url}`)
    }
    res.setHeader("content-type", "application/json")
    res.end(JSON.stringify(response))
  } catch (error) {
    active.error = String(error)
    res.statusCode = 500
    res.end(JSON.stringify({ error: String(error) }))
  }
})

server.listen(0, "127.0.0.1")
await once(server, "listening")
const port = server.address().port
console.log(`Published @tscircuit/cli: ${version}`)
console.log(`Node: ${process.version}; mock registry: loopback only`)
console.log(
  "MOCK ONLY: CLI 'published' messages below reflect canned local responses, not live publication.",
)

try {
  for (const mode of [
    "push-archive",
    "push-individual",
    "dev-ignored",
    "dev-control",
  ]) {
    const projectDir = join(scratch, mode, "project")
    const configDir = join(scratch, mode, "config")
    await cp(join(here, "project"), projectDir, { recursive: true })
    await mkdir(configDir, { recursive: true })
    await writeFile(
      join(configDir, "config.json"),
      JSON.stringify({
        sessionToken: "dummy-local-only-token",
        tscircuitHandle: "repro-user",
        registryApiUrl: `http://127.0.0.1:${port}`,
      }),
    )
    if (mode === "dev-control") {
      await writeFile(join(projectDir, "tscircuit.config.json"), "{}\n")
    }
    active = { mode, requests: [], files: [] }
    const args = mode.startsWith("dev-")
      ? [
          fileURLToPath(import.meta.url),
          "--dev-worker",
          cliRoot,
          projectDir,
          String(port),
        ]
      : [
          join(cliRoot, "dist/cli/main.js"),
          "push",
          ...(mode === "push-individual" ? ["--no-compress"] : []),
        ]
    const child = spawn(bun, args, {
      cwd: projectDir,
      env: {
        ...process.env,
        TSCIRCUIT_CONFIG_DIR: configDir,
        TSCIRCUIT_TOKEN: "",
        TSCI_SKIP_CLI_UPDATE: "true",
        TSCI_TELEMETRY_DISABLED: "true",
        NO_COLOR: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    })
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (chunk) => {
      stdout += chunk
    })
    child.stderr.on("data", (chunk) => {
      stderr += chunk
    })
    const timeout = setTimeout(() => child.kill("SIGKILL"), 60_000)
    const [code] = await once(child, "close")
    clearTimeout(timeout)
    console.log(`\n${mode}: exit=${code}`)
    console.log(stdout.trim())
    if (stderr.trim()) console.log(`stderr: ${stderr.trim()}`)
    assert.equal(code, 0, `CLI failed in ${mode}; reproduction incomplete`)
    assert.equal(active.error, undefined)
    const paths = active.files.map((file) => file.file_path).sort()
    const dummy = active.files.find(
      (file) => file.file_path === "datasheets/test.txt",
    )
    console.log(`Requests: ${active.requests.join(", ")}`)
    console.log(`Captured files: ${JSON.stringify(paths)}`)
    // Positive control: prove the uploader selected a valid project file.
    assert(paths.includes("index.circuit.tsx"))
    const shouldContainDummy = mode !== "dev-ignored"
    assert.equal(
      Boolean(dummy),
      shouldContainDummy,
      `Unexpected behavior in ${mode}`,
    )
    if (mode.startsWith("push-")) {
      assert.equal(
        dummy.content_text,
        await readFile(join(projectDir, "datasheets/test.txt"), "utf8"),
      )
      console.log(
        "BUG REPRODUCED LOCALLY: excluded dummy bytes reached the upload request",
      )
    } else {
      console.log(`DevServer initial upload contains dummy: ${Boolean(dummy)}`)
    }
    results.push({
      mode,
      exitCode: code,
      requests: active.requests,
      files: paths,
      dummyIncluded: Boolean(dummy),
    })
  }
  console.log(
    "\nConfirmed local behavior in both push transports, with dev positive/negative controls.",
  )
  console.log(
    "No live registry push performed; mock success responses do not prove public publication.",
  )
  console.log(JSON.stringify({ cliVersion: version, results }, null, 2))
} finally {
  await new Promise((done) => server.close(done))
  await rm(scratch, { recursive: true, force: true })
}
