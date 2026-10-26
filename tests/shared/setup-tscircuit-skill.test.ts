import { afterEach, expect, mock, test } from "bun:test"
import { existsSync } from "node:fs"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { setupTscircuitSkill } from "lib/shared/setup-tscircuit-skill"

const originalFetch = globalThis.fetch
const originalSkipSkillSetup = process.env.TSCI_SKIP_SKILL_SETUP
const directories: string[] = []

afterEach(async () => {
  globalThis.fetch = originalFetch
  if (originalSkipSkillSetup === undefined) {
    delete process.env.TSCI_SKIP_SKILL_SETUP
  } else {
    process.env.TSCI_SKIP_SKILL_SETUP = originalSkipSkillSetup
  }
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

test.each([false, true])(
  "TSCI_SKIP_SKILL_SETUP skips skill setup with skipPrompt=%s",
  async (skipPrompt) => {
    const directory = await mkdtemp(join(tmpdir(), "skip-skill-"))
    directories.push(directory)
    process.env.TSCI_SKIP_SKILL_SETUP = "true"
    const fetchSpy = mock(() => {
      throw new Error("Network access is forbidden")
    })
    globalThis.fetch = Object.assign(fetchSpy, {
      preconnect: originalFetch.preconnect,
    }) as typeof fetch

    expect(await setupTscircuitSkill(directory, skipPrompt)).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(existsSync(join(directory, ".claude"))).toBe(false)
    expect(existsSync(join(directory, ".agents"))).toBe(false)
  },
)

test.each([undefined, "false"])(
  "skill setup retains its default behavior when the skip flag is %s",
  async (value) => {
    const directory = await mkdtemp(join(tmpdir(), "setup-skill-"))
    directories.push(directory)
    if (value === undefined) delete process.env.TSCI_SKIP_SKILL_SETUP
    else process.env.TSCI_SKIP_SKILL_SETUP = value
    const fetchSpy = mock(async (url: string | URL | Request) => {
      if (String(url) === "https://example.com/SKILL.md") {
        return new Response("Skill instructions")
      }
      return Response.json([
        {
          name: "SKILL.md",
          type: "file",
          download_url: "https://example.com/SKILL.md",
        },
      ])
    })
    globalThis.fetch = Object.assign(fetchSpy, {
      preconnect: originalFetch.preconnect,
    }) as typeof fetch

    expect(await setupTscircuitSkill(directory, true)).toBe(true)
    expect(fetchSpy).toHaveBeenCalled()
    for (const agent of [".claude", ".agents"]) {
      expect(
        await readFile(
          join(directory, agent, "skills/tscircuit/SKILL.md"),
          "utf8",
        ),
      ).toBe("Skill instructions")
    }
  },
)
