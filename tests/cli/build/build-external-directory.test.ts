import { afterEach, expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"

const repoDir = path.resolve(import.meta.dir, "../../..")
const registerBuildUrl = pathToFileURL(
  path.join(repoDir, "cli/build/register.ts"),
).href
const commanderUrl = import.meta.resolve("commander")
const temporaryDirectories: string[] = []
const circuitJson = [
  {
    type: "source_component",
    source_component_id: "source_component_0",
    name: "R1",
  },
]

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

const createProjects = async () => {
  const workspace = await mkdtemp(
    path.join(os.tmpdir(), "tsci-build-directory-"),
  )
  temporaryDirectories.push(workspace)
  const caller = path.join(workspace, "caller")
  const target = path.join(workspace, "target")
  for (const projectDir of [caller, target]) {
    await mkdir(projectDir)
    await writeFile(path.join(projectDir, "package.json"), "{}")
  }
  return { caller, target }
}

const writeCircuit = async (filePath: string) => {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(circuitJson))
}

const writeConfig = async (
  projectDir: string,
  config: Record<string, unknown>,
) => {
  await writeFile(
    path.join(projectDir, "tscircuit.config.json"),
    JSON.stringify(config),
  )
}

const runBuild = async (cwd: string, args: string[]) => {
  // Exercise the actual command handler without starting unrelated commands.
  const source = `
    import { Command } from ${JSON.stringify(commanderUrl)}
    import { registerBuild } from ${JSON.stringify(registerBuildUrl)}
    const program = new Command()
    registerBuild(program)
    await program.parseAsync(${JSON.stringify(["bun", "tsci", "build", ...args])})
  `
  const task = Bun.spawn(
    [
      process.execPath,
      "--tsconfig-override",
      path.join(repoDir, "tsconfig.json"),
      "--eval",
      source,
    ],
    {
      cwd,
      env: { ...process.env, TSCI_TEST_MODE: "true", FORCE_COLOR: "0" },
      stdout: "pipe",
      stderr: "pipe",
      timeout: 15_000,
    },
  )
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(task.stdout).text(),
    new Response(task.stderr).text(),
    task.exited,
  ])
  return { stdout, stderr, exitCode }
}

for (const absolute of [false, true]) {
  test(`build external directory uses its config and output root (absolute=${absolute})`, async () => {
    const { caller, target } = await createProjects()
    await writeCircuit(path.join(target, "selected.circuit.json"))
    await writeCircuit(path.join(target, "ignored.circuit.json"))
    await writeConfig(caller, {
      includeBoardFiles: ["caller-only/*.circuit.json"],
    })
    await writeConfig(target, {
      includeBoardFiles: ["selected.circuit.json"],
      build: { routingDisabled: true },
    })

    const result = await runBuild(caller, [
      absolute ? target : path.relative(caller, target),
    ])

    expect(result.stderr).toBe("")
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain("routing-disabled")
    expect(
      JSON.parse(
        await readFile(path.join(target, "dist/selected/circuit.json"), "utf8"),
      ),
    ).toEqual(circuitJson)
    expect(existsSync(path.join(target, "dist/ignored"))).toBe(false)
    expect(existsSync(path.join(caller, "dist"))).toBe(false)
    expect(existsSync(path.join(target, "selected/circuit.json"))).toBe(false)
  }, 30_000)
}

test("build external subdirectory keeps its enclosing project's config and output root", async () => {
  const { caller, target } = await createProjects()
  const selectedDir = path.join(target, "boards/selected")
  await writeCircuit(path.join(selectedDir, "board.circuit.json"))
  await writeCircuit(path.join(target, "boards/other/board.circuit.json"))
  await writeConfig(target, { includeBoardFiles: ["boards/**/*.circuit.json"] })

  const result = await runBuild(caller, [path.relative(caller, selectedDir)])

  expect(result.stderr).toBe("")
  expect(result.exitCode).toBe(0)
  expect(
    JSON.parse(
      await readFile(
        path.join(target, "dist/boards/selected/board/circuit.json"),
        "utf8",
      ),
    ),
  ).toEqual(circuitJson)
  expect(existsSync(path.join(target, "dist/boards/other"))).toBe(false)
  expect(existsSync(path.join(selectedDir, "dist"))).toBe(false)
  expect(existsSync(path.join(caller, "dist"))).toBe(false)
}, 30_000)

test("build internal subdirectory retains caller config even with a nested package", async () => {
  const { caller } = await createProjects()
  const src = path.join(caller, "src")
  await writeCircuit(path.join(src, "selected.circuit.json"))
  await writeCircuit(path.join(src, "ignored.circuit.json"))
  await writeFile(path.join(src, "package.json"), "{}")
  await writeConfig(src, { includeBoardFiles: ["ignored.circuit.json"] })
  await writeConfig(caller, {
    includeBoardFiles: ["src/selected.circuit.json"],
  })

  const result = await runBuild(caller, ["src"])

  expect(result.stderr).toBe("")
  expect(result.exitCode).toBe(0)
  expect(
    JSON.parse(
      await readFile(
        path.join(caller, "dist/src/selected/circuit.json"),
        "utf8",
      ),
    ),
  ).toEqual(circuitJson)
  expect(existsSync(path.join(caller, "dist/src/ignored"))).toBe(false)
  expect(existsSync(path.join(src, "dist"))).toBe(false)
}, 30_000)

test("build keeps default discovery and explicit external file behavior", async () => {
  const { caller, target } = await createProjects()
  await writeCircuit(path.join(caller, "local.circuit.json"))
  const externalFile = path.join(target, "external.circuit.json")
  await writeCircuit(externalFile)
  await writeConfig(target, { includeBoardFiles: ["excluded/*.circuit.json"] })

  const defaultResult = await runBuild(caller, [])
  expect(defaultResult.stderr).toBe("")
  expect(defaultResult.exitCode).toBe(0)
  expect(existsSync(path.join(caller, "dist/local/circuit.json"))).toBe(true)

  const fileResult = await runBuild(caller, [externalFile])
  expect(fileResult.stderr).toBe("")
  expect(fileResult.exitCode).toBe(0)
  expect(
    JSON.parse(
      await readFile(path.join(target, "dist/external/circuit.json"), "utf8"),
    ),
  ).toEqual(circuitJson)
}, 30_000)

test("build external directory reports its own no-match patterns", async () => {
  const { caller, target } = await createProjects()
  await writeCircuit(path.join(target, "ignored.circuit.json"))
  await writeConfig(caller, {
    includeBoardFiles: ["caller-only/*.circuit.json"],
  })
  await writeConfig(target, { includeBoardFiles: ["boards/*.circuit.json"] })

  const result = await runBuild(caller, [target])

  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain('No buildable files found in directory: "."')
  expect(result.stderr).toContain('["boards/*.circuit.json"]')
  expect(result.stderr).not.toContain("caller-only")
  expect(existsSync(path.join(caller, "dist"))).toBe(false)
  expect(existsSync(path.join(target, "dist"))).toBe(false)
}, 30_000)

test("build external directory without package.json uses the target itself", async () => {
  const { caller, target } = await createProjects()
  await rm(path.join(target, "package.json"))
  await writeCircuit(path.join(target, "board.circuit.json"))

  const result = await runBuild(caller, [target])

  expect(result.stderr).toBe("")
  expect(result.exitCode).toBe(0)
  expect(
    JSON.parse(
      await readFile(path.join(target, "dist/board/circuit.json"), "utf8"),
    ),
  ).toEqual(circuitJson)
  expect(existsSync(path.join(caller, "dist"))).toBe(false)
}, 30_000)
