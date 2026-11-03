import { afterAll, beforeAll, expect, test } from "bun:test"
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

let root: string
let runtime: string
let record: string
let sequence = 0

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "tsci runtime & spaces "))
  const entry = join(root, "embedded.ts")
  await writeFile(
    entry,
    'throw new Error("The compiled application must not run as the runtime")',
  )
  runtime = join(
    root,
    process.platform === "win32" ? "custom runtime.exe" : "custom runtime",
  )
  const build = await Bun.build({
    entrypoints: [entry],
    compile: { outfile: runtime },
  })
  expect(build.success).toBe(true)
  if (process.platform === "darwin") {
    expect(
      Bun.spawnSync(["codesign", "--force", "--sign", "-", runtime]).exitCode,
    ).toBe(0)
  }
  record = join(root, "record.ts")
  await writeFile(
    record,
    `import { appendFileSync } from 'node:fs'
appendFileSync(process.env.RUNTIME_LOG, JSON.stringify({ args:process.argv.slice(2), path:process.env.PATH, bun:process.env.BUN_BE_BUN })+'\\n')
`,
  )
}, 60_000)

afterAll(async () => {
  if (root) await rm(root, { recursive: true, force: true })
})

async function run(
  source: string,
  env: Record<string, string | undefined> = {},
) {
  const cwd = join(root, `project-${sequence++}`)
  await mkdir(cwd)
  await writeFile(join(cwd, "package-lock.json"), "{}")
  const script = join(cwd, "driver.ts")
  await writeFile(script, source)
  const child = Bun.spawn([process.execPath, script], {
    cwd,
    env: {
      ...process.env,
      PATH: "",
      BUN_BE_BUN: undefined,
      npm_config_user_agent: "npm/10",
      TSCIRCUIT_NODE_RUNTIME: runtime,
      TSCIRCUIT_NODE_RUNTIME_ARGS: JSON.stringify([record]),
      RUNTIME_LOG: join(cwd, "calls.jsonl"),
      ...env,
    },
    stdout: "pipe",
    stderr: "pipe",
  })
  const [code, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  return { cwd, code, stdout, stderr }
}

const packageManagerModule = JSON.stringify(
  resolve("lib/shared/get-package-manager.ts"),
)

test("configured runtime handles every package operation without a shell or PATH changes", async () => {
  const result =
    await run(`import { getPackageManager } from ${packageManagerModule}
const pm=getPackageManager()
if(pm.name!=='bun') throw Error('Explicit runtime must take precedence over npm and lockfiles')
const cwd=process.cwd()
pm.init({cwd})
await pm.install({name:['first','second'],cwd})
await pm.installDeps({deps:['file:folder with spaces & symbols'],dev:true,cwd})
pm.installAll({cwd})
pm.update({name:['first','second'],cwd})
pm.uninstall({name:'first',cwd})
pm.installGlobal({name:'tscircuit@latest',cwd})
if(process.env.PATH!=='' || process.env.BUN_BE_BUN!==undefined) throw Error('Parent environment changed')
`)
  expect(result.code, result.stderr).toBe(0)
  const calls = (await Bun.file(join(result.cwd, "calls.jsonl")).text())
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line))
  expect(calls.map((call) => call.args)).toEqual([
    ["init", "-y"],
    ["add", "first", "second"],
    ["add", "-d", "file:folder with spaces & symbols"],
    ["install"],
    ["update", "first", "second"],
    ["remove", "first"],
    ["install", "-g", "tscircuit@latest"],
  ])
  for (const call of calls) {
    expect(call.path).toBe("")
    expect(call.bun).toBe("1")
  }
})

test("entrypoint starts the CLI with the configured embedded runtime", async () => {
  const packageRoot = join(root, "entrypoint package")
  await mkdir(join(packageRoot, "cli"), { recursive: true })
  await mkdir(join(packageRoot, "dist/cli"), { recursive: true })
  for (const file of ["entrypoint.js", "node-runtime.js"])
    await copyFile(resolve("cli", file), join(packageRoot, "cli", file))
  await writeFile(
    join(packageRoot, "package.json"),
    JSON.stringify({ type: "module", version: "0.0.0" }),
  )
  await writeFile(
    join(packageRoot, "dist/cli/main.js"),
    `console.log(JSON.stringify({args:process.argv.slice(2),path:process.env.PATH,bun:process.env.BUN_BE_BUN}))`,
  )
  const entrypoint = JSON.stringify(join(packageRoot, "cli/entrypoint.js"))
  const result = await run(
    `process.argv=['node','entrypoint','--use-global','--example']; await import(${entrypoint})`,
    { TSCIRCUIT_NODE_RUNTIME_ARGS: "[]" },
  )
  expect(result.code, result.stderr).toBe(0)
  expect(JSON.parse(result.stdout)).toEqual({
    args: ["--example"],
    path: "",
    bun: "1",
  })
  const missing = await run(
    `process.argv=['node','entrypoint','--use-global']; await import(${entrypoint})`,
    {
      TSCIRCUIT_NODE_RUNTIME: join(root, "missing runtime"),
      TSCIRCUIT_NODE_RUNTIME_ARGS: "[]",
    },
  )
  expect(missing.code).toBe(1)
  expect(missing.stderr).toContain("Unable to start runtime")
})

test("an unavailable configured runtime fails instead of selecting another package manager", async () => {
  const result = await run(
    `import { getPackageManager } from ${packageManagerModule}; getPackageManager().installAll({cwd:process.cwd()})`,
    { TSCIRCUIT_NODE_RUNTIME: join(root, "missing runtime") },
  )
  expect(result.code).not.toBe(0)
  expect(await Bun.file(join(result.cwd, "calls.jsonl")).exists()).toBe(false)
})

test("unset runtime preserves normal package manager selection", async () => {
  const result = await run(
    `import { getPackageManager } from ${packageManagerModule}; console.log(getPackageManager().name)`,
    {
      TSCIRCUIT_NODE_RUNTIME: undefined,
      TSCIRCUIT_NODE_RUNTIME_ARGS: undefined,
    },
  )
  expect(result.code, result.stderr).toBe(0)
  expect(result.stdout.trim()).toBe("npm")
})

test("runtime arguments must be a JSON array of strings", async () => {
  const result = await run(
    `import { getPackageManager } from ${packageManagerModule}; getPackageManager()`,
    { TSCIRCUIT_NODE_RUNTIME_ARGS: '["valid", 123]' },
  )
  expect(result.code).not.toBe(0)
  expect(result.stderr).toContain("JSON array of strings")
})
