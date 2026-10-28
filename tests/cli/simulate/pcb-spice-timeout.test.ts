import { test, expect } from "bun:test"
import { writeFile, readFile, symlink } from "node:fs/promises"
import { join, resolve } from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

// The command renders native TSX. Only the native process boundary is replaced,
// in an isolated CLI child, so these tests never run a long solver or fake an eye.
test.failing(
  "forwards native solver timeout and keeps default",
  async () => {
    const preload = resolve(
      "tests/cli/simulate/fixtures/record-native-timeout.ts",
    )
    const { tmpDir, runCommand } = await getCliTestFixture({ preload })
    await symlink(resolve("node_modules"), join(tmpDir, "node_modules"), "dir")
    const file = join(tmpDir, "timeout.circuit.tsx")
    await writeFile(
      file,
      `import { analog } from "@tscircuit/core"
export default () => <board width={10} height={10} routingDisabled schematicDisabled>
  <analog.transientsimulation name="SI" spiceEngine="pcb_spice" duration="512ns" timePerStep="10ps" />
</board>`,
    )
    for (const [flag, expected] of [
      ["", null],
      ["--solver-timeout-ms 1800000", 1800000],
    ]) {
      const result = await runCommand(
        `tsci simulate ${file} --disable-parts-engine ${flag}`.trim(),
      )
      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain("stopped at native process boundary")
      expect(
        JSON.parse(await readFile(join(tmpDir, "native-options.json"), "utf8")),
      ).toEqual(expected)
    }
  },
  30_000,
)

test.failing(
  "rejects invalid native solver timeouts",
  async () => {
    const { runCommand } = await getCliTestFixture()
    for (const value of [
      "0",
      "-1",
      "1.5",
      "NaN",
      "Infinity",
      "9007199254740992",
    ]) {
      const { exitCode, stderr } = await runCommand(
        `tsci simulate missing.tsx --solver-timeout-ms ${value}`,
      )
      expect(exitCode).not.toBe(0)
      expect(stderr).toContain("positive safe integer")
    }
  },
  30_000,
)
