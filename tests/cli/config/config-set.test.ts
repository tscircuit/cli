import { expect, test } from "bun:test"
import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test.each([
  ["invalid JSON", '{"snapshotsDir":"previews",}'],
  [
    "invalid setting",
    '{"snapshotsDir":"previews","useCloudAutorouting":"off"}',
  ],
])(
  "config set preserves a project config with %s",
  async (_, original) => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    const configPath = join(tmpDir, "tscircuit.config.json")
    await writeFile(configPath, original)

    const { exitCode, stderr } = await runCommand(
      "tsci config set mainEntrypoint board.tsx",
    )
    expect(await readFile(configPath, "utf8")).toBe(original)
    expect(exitCode).toBe(1)
    expect(stderr).toContain("tscircuit.config.json")
  },
  30_000,
)

test("config set creates a project config and preserves settings on update", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const configPath = join(tmpDir, "tscircuit.config.json")

  expect(
    (await runCommand("tsci config set mainEntrypoint board.tsx")).exitCode,
  ).toBe(0)
  expect(
    (await runCommand("tsci config set previewComponentPath preview.tsx"))
      .exitCode,
  ).toBe(0)
  expect(JSON.parse(await readFile(configPath, "utf8"))).toMatchObject({
    mainEntrypoint: "board.tsx",
    previewComponentPath: "preview.tsx",
  })
}, 30_000)
