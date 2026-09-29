import { expect, test } from "bun:test"
import { symlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

for (const concurrency of [1, 2]) {
  test(`build fails when DRC rejects without emitting circuit errors (concurrency ${concurrency})`, async () => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    await symlink(
      path.resolve("node_modules"),
      path.join(tmpDir, "node_modules"),
      "dir",
    )
    await writeFile(path.join(tmpDir, "package.json"), "{}")
    await writeFile(
      path.join(tmpDir, "index.tsx"),
      `import { Board } from "tscircuit"
Board.prototype.doInitialPcbDesignRuleChecks = function () {
  this._queueAsyncEffect("board:drc-checks", async () => {
    throw new Error("Injected copper-pour DRC failure")
  })
}
export default () => <board width={10} height={10} routingDisabled>
  <resistor name="R1" resistance="1k" footprint="0402" />
</board>`,
    )
    const { exitCode, stdout, stderr } = await runCommand(
      `tsci build index.tsx --concurrency ${concurrency}`,
    )
    expect(exitCode).toBe(1)
    expect(stdout + stderr).toContain("board:drc-checks")
    expect(stdout + stderr).toContain("Injected copper-pour DRC failure")
    expect(stdout).not.toContain("build finished successfully")
    expect(stdout).not.toContain("1 passed")
  }, 30_000)
}
