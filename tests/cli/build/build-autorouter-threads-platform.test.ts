import { expect, test } from "bun:test"
import { mkdir, readFile, symlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

test.each([
  { concurrency: 1, flag: "--autorouter-threads 2", expectedThreads: 2 },
  { concurrency: 3, flag: "--autorouter-threads 2", expectedThreads: 2 },
  { concurrency: 1, flag: "", expectedThreads: 1 },
  { concurrency: 3, flag: "", expectedThreads: 1 },
])(
  "build forwards the effective thread count to core: %j",
  async ({ concurrency, flag, expectedThreads }) => {
    const { tmpDir, runCommand } = await getCliTestFixture()
    const runtimeDir = path.join(tmpDir, "node_modules", "tscircuit")
    const threadsLog = path.join(tmpDir, "autorouter-threads.jsonl")
    await mkdir(runtimeDir, { recursive: true })
    await symlink(
      path.dirname(require.resolve("react/package.json")),
      path.join(tmpDir, "node_modules", "react"),
      "dir",
    )
    await writeFile(
      path.join(runtimeDir, "package.json"),
      JSON.stringify({
        name: "tscircuit",
        type: "module",
        exports: "./index.mjs",
      }),
    )
    // Observe the real core instance without replacing the build action or workers.
    await writeFile(
      path.join(runtimeDir, "index.mjs"),
      String.raw`
        import { appendFileSync } from "node:fs"
        import { RootCircuit as BaseCircuit } from ${JSON.stringify(import.meta.resolve("tscircuit"))}
        export class RootCircuit extends BaseCircuit {
          constructor(options) {
            super(options)
            appendFileSync(${JSON.stringify(threadsLog)}, JSON.stringify(this.platform.autorouterThreads) + "\n")
          }
        }
      `,
    )
    await writeFile(
      path.join(tmpDir, "tscircuit.config.ts"),
      "export default { platformConfig: { autorouterThreads: 1 } }",
    )
    const boards = ["first", "second", "third"]
    for (const name of boards) {
      await writeFile(
        path.join(tmpDir, `${name}.circuit.tsx`),
        "export default () => <board width={8} height={8} />",
      )
    }

    const { exitCode, stdout, stderr } = await runCommand(
      `tsci build --concurrency ${concurrency} ${flag}`.trim(),
    )

    expect(stderr).toBe("")
    expect(exitCode).toBe(0)
    if (concurrency > 1) {
      expect(stdout).toContain(
        `Building 3 file(s) with concurrency ${concurrency}`,
      )
    }
    const observedThreads = (await readFile(threadsLog, "utf-8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line))
    expect(observedThreads).toEqual(boards.map(() => expectedThreads))
    for (const name of boards) {
      const circuitJson = JSON.parse(
        await readFile(
          path.join(tmpDir, "dist", name, "circuit.json"),
          "utf-8",
        ),
      )
      expect(
        circuitJson.some((element: any) => element.type === "pcb_board"),
      ).toBe(true)
    }
  },
  30_000,
)
