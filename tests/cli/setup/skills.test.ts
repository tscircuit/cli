import { afterEach, beforeEach, expect, spyOn, test } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { registerSetup } from "cli/setup/register"
import { Command } from "commander"
import {
  installTscircuitSkill,
  setupTscircuitSkill,
} from "lib/shared/setup-tscircuit-skill"
import { temporaryDirectory } from "tempy"

const apiUrl = "https://api.github.com/repos/tscircuit/skill/contents"
const installPaths = [".claude/skills/tscircuit", ".agents/skills/tscircuit"]
const legacyPath = ".codex/skills/tscircuit"
const binaryAsset = new Uint8Array([0, 255, 128, 42])
let tmpDir: string
let responses: Map<string, () => Response>
let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, "fetch">>

function writeInstalled(skillPath: string, content = "old skill") {
  const target = path.join(tmpDir, skillPath)
  fs.mkdirSync(target, { recursive: true })
  fs.writeFileSync(path.join(target, "SKILL.md"), content)
  fs.writeFileSync(path.join(target, "local-notes.md"), "local edits")
}

function readSkill(skillPath: string) {
  return fs.readFileSync(path.join(tmpDir, skillPath, "SKILL.md"), "utf8")
}

beforeEach(() => {
  tmpDir = temporaryDirectory()
  responses = new Map([
    [
      apiUrl,
      () =>
        Response.json([
          {
            name: "SKILL.md",
            type: "file",
            download_url: "https://fixture.test/skill",
          },
          {
            name: "FOOTPRINTS.md",
            type: "file",
            download_url: "https://fixture.test/footprints",
          },
          { name: "assets", type: "dir", download_url: null },
          { name: ".github", type: "dir", download_url: null },
        ]),
    ],
    ["https://fixture.test/skill", () => new Response("new skill")],
    [
      "https://fixture.test/footprints",
      () => new Response("Use footprint strings"),
    ],
    [
      `${apiUrl}/assets`,
      () =>
        Response.json([
          {
            name: "image.png",
            type: "file",
            download_url: "https://fixture.test/image",
          },
        ]),
    ],
    ["https://fixture.test/image", () => new Response(binaryAsset)],
  ])
  const mockFetch = Object.assign(
    async (input: Parameters<typeof fetch>[0]) => {
      const url = input instanceof Request ? input.url : String(input)
      return (
        responses.get(url)?.() ?? new Response("Not found", { status: 404 })
      )
    },
    { preconnect: globalThis.fetch.preconnect },
  )
  fetchSpy = spyOn(globalThis, "fetch").mockImplementation(mockFetch)
})

afterEach(() => {
  fetchSpy.mockRestore()
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

test("installs a complete skill in both locations and preserves binary assets", async () => {
  await installTscircuitSkill(tmpDir)
  for (const skillPath of installPaths) {
    expect(readSkill(skillPath)).toBe("new skill")
    expect(
      fs.readFileSync(path.join(tmpDir, skillPath, "assets/image.png")),
    ).toEqual(Buffer.from(binaryAsset))
    expect(fs.existsSync(path.join(tmpDir, skillPath, ".github"))).toBe(false)
  }
  expect(fetchSpy.mock.calls.filter(([url]) => url === apiUrl)).toHaveLength(1)
  expect(fs.readdirSync(path.join(tmpDir, ".tscircuit/skill-updates"))).toEqual(
    [],
  )
  expect(fs.existsSync(path.join(tmpDir, legacyPath))).toBe(false)
})

test("init preserves existing installs and explains how to update without fetching", async () => {
  for (const skillPath of installPaths) writeInstalled(skillPath)
  const log = spyOn(console, "log").mockImplementation(() => {})
  try {
    expect(await setupTscircuitSkill(tmpDir, true)).toBe(true)
    for (const skillPath of installPaths)
      expect(readSkill(skillPath)).toBe("old skill")
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(log.mock.calls.flat().join(" ")).toContain(
      "tsci setup skills --update",
    )
  } finally {
    log.mockRestore()
  }
})

test("fills a missing install without changing the existing copy", async () => {
  writeInstalled(installPaths[0], "custom skill")
  await installTscircuitSkill(tmpDir)
  expect(readSkill(installPaths[0])).toBe("custom skill")
  expect(readSkill(installPaths[1])).toBe("new skill")
})

test("update refreshes existing and legacy copies and backs up all local files", async () => {
  const paths = [...installPaths, legacyPath]
  for (const skillPath of paths) writeInstalled(skillPath)
  await installTscircuitSkill(tmpDir, { update: true })
  const updatesDir = path.join(tmpDir, ".tscircuit/skill-updates")
  const runs = fs.readdirSync(updatesDir)
  expect(runs).toHaveLength(1)
  const runDir = path.join(updatesDir, runs[0])
  expect(fs.readdirSync(runDir)).toEqual(["backups"])
  for (const skillPath of paths) {
    expect(readSkill(skillPath)).toBe("new skill")
    expect(
      fs.readFileSync(path.join(tmpDir, skillPath, "FOOTPRINTS.md"), "utf8"),
    ).toBe("Use footprint strings")
    expect(fs.existsSync(path.join(tmpDir, skillPath, "local-notes.md"))).toBe(
      false,
    )
    const backup = path.join(runDir, "backups", skillPath)
    expect(fs.readFileSync(path.join(backup, "SKILL.md"), "utf8")).toBe(
      "old skill",
    )
    expect(fs.readFileSync(path.join(backup, "local-notes.md"), "utf8")).toBe(
      "local edits",
    )
  }
})

test("a failed download leaves every installed copy untouched", async () => {
  for (const skillPath of installPaths) writeInstalled(skillPath)
  responses.set(
    "https://fixture.test/footprints",
    () => new Response("Unavailable", { status: 503 }),
  )
  await expect(installTscircuitSkill(tmpDir, { update: true })).rejects.toThrow(
    "Failed to fetch",
  )
  for (const skillPath of installPaths)
    expect(readSkill(skillPath)).toBe("old skill")
  expect(fs.readdirSync(path.join(tmpDir, ".tscircuit/skill-updates"))).toEqual(
    [],
  )
})

test("a download without SKILL.md cannot replace an installed skill", async () => {
  for (const skillPath of installPaths) writeInstalled(skillPath)
  responses.set(apiUrl, () => Response.json([]))
  await expect(installTscircuitSkill(tmpDir, { update: true })).rejects.toThrow(
    "does not contain SKILL.md",
  )
  for (const skillPath of installPaths)
    expect(readSkill(skillPath)).toBe("old skill")
})

test("a replacement failure rolls back copies already updated", async () => {
  for (const skillPath of installPaths) writeInstalled(skillPath)
  const originalRename = fs.renameSync
  let injectedFailure = false
  const rename = spyOn(fs, "renameSync").mockImplementation((from, to) => {
    if (
      !injectedFailure &&
      String(from).includes("replacements") &&
      to === path.join(tmpDir, installPaths[1])
    ) {
      injectedFailure = true
      throw new Error("simulated rename failure")
    }
    return originalRename(from, to)
  })
  try {
    await expect(
      installTscircuitSkill(tmpDir, { update: true }),
    ).rejects.toThrow("simulated rename failure")
    expect(injectedFailure).toBe(true)
    for (const skillPath of installPaths)
      expect(readSkill(skillPath)).toBe("old skill")
    expect(
      fs.readdirSync(path.join(tmpDir, ".tscircuit/skill-updates")),
    ).toEqual([])
  } finally {
    rename.mockRestore()
  }
})

test("setup skills --global --update targets home, including the legacy Codex copy", async () => {
  writeInstalled(legacyPath)
  const home = spyOn(os, "homedir").mockReturnValue(tmpDir)
  // Guard the write boundary as well as mocking home resolution: a broken
  // mock must never turn this test into a real home-directory installation.
  const originalMkdir = fs.mkdirSync
  const mkdir = spyOn(fs, "mkdirSync").mockImplementation(
    (...args: Parameters<typeof fs.mkdirSync>) => {
      expect(
        path.resolve(String(args[0])).startsWith(`${tmpDir}${path.sep}`),
      ).toBe(true)
      return originalMkdir(...args)
    },
  )
  try {
    const program = new Command()
    registerSetup(program)
    await program.parseAsync(["setup", "skills", "--global", "--update"], {
      from: "user",
    })
    for (const skillPath of [...installPaths, legacyPath])
      expect(readSkill(skillPath)).toBe("new skill")
  } finally {
    home.mockRestore()
    mkdir.mockRestore()
  }
})

test("explicit setup command fails on download errors instead of continuing init", async () => {
  const cwd = spyOn(process, "cwd").mockReturnValue(tmpDir)
  responses.set(apiUrl, () => new Response("Unavailable", { status: 503 }))
  try {
    const program = new Command()
      .exitOverride()
      .configureOutput({ writeErr: () => {} })
    registerSetup(program)
    await expect(
      program.parseAsync(["setup", "skills"], { from: "user" }),
    ).rejects.toMatchObject({ exitCode: 1 })
    for (const skillPath of installPaths)
      expect(fs.existsSync(path.join(tmpDir, skillPath))).toBe(false)
  } finally {
    cwd.mockRestore()
  }
})

test("keeps original backups when a failed replacement cannot be rolled back", async () => {
  for (const skillPath of installPaths) writeInstalled(skillPath)
  const originalRename = fs.renameSync
  const rename = spyOn(fs, "renameSync").mockImplementation((from, to) => {
    if (String(from).includes("replacements"))
      throw new Error("replacement failed")
    if (String(from).includes("backups")) throw new Error("restore failed")
    return originalRename(from, to)
  })
  try {
    await expect(
      installTscircuitSkill(tmpDir, { update: true }),
    ).rejects.toThrow("could not be fully restored. Backups:")
    const updatesDir = path.join(tmpDir, ".tscircuit/skill-updates")
    const [run] = fs.readdirSync(updatesDir)
    const backup = path.join(updatesDir, run, "backups", installPaths[0])
    expect(fs.readFileSync(path.join(backup, "SKILL.md"), "utf8")).toBe(
      "old skill",
    )
    expect(fs.readFileSync(path.join(backup, "local-notes.md"), "utf8")).toBe(
      "local edits",
    )
    expect(readSkill(installPaths[1])).toBe("old skill")
  } finally {
    rename.mockRestore()
  }
})

test("preserves a relative skill symlink in the backup without modifying its source", async () => {
  const customDir = path.join(tmpDir, "custom-skill")
  fs.mkdirSync(customDir)
  fs.writeFileSync(path.join(customDir, "SKILL.md"), "custom skill")
  const target = path.join(tmpDir, installPaths[0])
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.symlinkSync("../../custom-skill", target, "dir")
  await installTscircuitSkill(tmpDir, { update: true })
  expect(readSkill(installPaths[0])).toBe("new skill")
  expect(fs.readFileSync(path.join(customDir, "SKILL.md"), "utf8")).toBe(
    "custom skill",
  )
  const updatesDir = path.join(tmpDir, ".tscircuit/skill-updates")
  const [run] = fs.readdirSync(updatesDir)
  const backup = path.join(updatesDir, run, "backups", installPaths[0])
  expect(fs.lstatSync(backup).isSymbolicLink()).toBe(true)
  expect(fs.readlinkSync(backup)).toBe("../../custom-skill")
})
