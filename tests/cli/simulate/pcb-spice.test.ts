import { expect, test } from "bun:test"
import {
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

// The executable supplies recorded solver responses. Rendering, validation,
// IBIS conversion, parsing, result serialization and report generation are real.
test("pcb_spice accepts raw modeling inputs, writes results, and rejects mixed engines and solver failures", async () => {
  const projectDir = await mkdtemp(join(tmpdir(), "pcb-spice-cli-"))
  try {
    await writeFile(join(projectDir, "package.json"), "{}")
    await mkdir(join(projectDir, "models"))
    for (const name of ["circuit.json", "modeling.json", "test.ibs"]) {
      await copyFile(
        resolve("tests/fixtures/pcb-spice", name),
        join(projectDir, name === "test.ibs" ? "models/test.ibs" : name),
      )
    }
    const impedance =
      "Row 1: N0a to N0b\nRow 2: N1a to N1b\nRow 3: N2a to N2b\nImpedance matrix for frequency = 1e+08 3 x 3\n0.0492610837 1j 0 0j 0 0j\n0 0j 0.0492610837 1j 0 0j\n0 0j 0 0j .002463054187 1j\n"
    const capacitance =
      "Capacitance matrix is:\nDimension 3 x 3\ng_sig0 4e-12 -1e-12 -1e-12\ng_sig1 -1e-12 4e-12 -1e-12\ng_return -1e-12 -1e-12 4e-12\nWeighted Frobenius norm of the difference between capacitance (auto option): 0.001\n"
    const waveform =
      "time a b\n" +
      Array.from({ length: 101 }, (_, i) =>
        [i * 1e-7, i % 2, 3.3 * (i % 2)].join(" "),
      ).join("\n") +
      "\n"
    const executable = join(projectDir, "recorded-solver.mjs")
    await writeFile(
      executable,
      `#!/usr/bin/env node
import { appendFileSync, writeFileSync } from "node:fs"
appendFileSync(${JSON.stringify(join(projectDir, "solver.log"))}, process.argv.slice(2).join(" ") + "\\n")
if (process.env.RECORDED_SOLVER_FAILURE) { console.error("recorded solver failure"); process.exit(2) }
if (process.argv.includes("channel.inp")) writeFileSync("Zc.mat", ${JSON.stringify(impedance)})
else if (process.argv.includes("channel.lst")) process.stdout.write(${JSON.stringify(capacitance)})
else writeFileSync("waveform.dat", ${JSON.stringify(waveform)})
`,
    )
    await chmod(executable, 0o755)
    await writeFile(
      join(projectDir, "tools.json"),
      JSON.stringify({
        fasthenry: executable,
        fastercap: executable,
        ngspice: executable,
      }),
    )
    const run = async (args: string[], env = {}) => {
      const child = Bun.spawn(
        ["bun", resolve("cli/main.ts"), "simulate", "analog", ...args],
        {
          cwd: projectDir,
          env: {
            ...process.env,
            PCB_SPICE_TOOLS: join(projectDir, "tools.json"),
            FORCE_COLOR: "0",
            ...env,
          },
          stdout: "pipe",
          stderr: "pipe",
        },
      )
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited,
      ])
      return { stdout, stderr, exitCode }
    }
    const args = [
      "circuit.json",
      "--modeling",
      "modeling.json",
      "--output",
      "results",
    ]
    const success = await run(args)
    expect(success.stderr).toBe("")
    expect(success.exitCode).toBe(0)
    const original = JSON.parse(
      await readFile(join(projectDir, "circuit.json"), "utf8"),
    )
    const results = JSON.parse(
      await readFile(join(projectDir, "results/circuit-results.json"), "utf8"),
    )
    expect(results.slice(0, original.length)).toEqual(original)
    const graph = results.find(
      (record: any) =>
        record.type === "simulation_transient_voltage_graph" &&
        record.simulation_voltage_probe_id === "diff",
    )
    expect(graph.timestamps_ms.at(-1)).toBeCloseTo(0.01, 10)
    expect(graph.voltage_levels[1]).toBe(1)
    expect(
      await readFile(join(projectDir, "results/results.html"), "utf8"),
    ).toContain("diff")
    expect(
      await readFile(
        join(projectDir, "results/experiments/run/waveform.csv"),
        "utf8",
      ),
    ).toContain("time_s,diff_v,single_v")
    const log = await readFile(join(projectDir, "solver.log"), "utf8")
    expect(log.trim().split("\n")).toHaveLength(4)
    const existing = await run(args)
    expect(existing.exitCode).not.toBe(0)
    expect(existing.stderr).toContain("fresh output directory")
    expect(await readFile(join(projectDir, "solver.log"), "utf8")).toBe(log)
    const mixed = [
      ...original,
      {
        ...original.find(
          (record: any) => record.type === "simulation_experiment",
        ),
        simulation_experiment_id: "other",
        spice_engine: "ngspice",
      },
    ]
    await writeFile(join(projectDir, "mixed.json"), JSON.stringify(mixed))
    const rejected = await run(["mixed.json", "--modeling", "modeling.json"])
    expect(rejected.exitCode).not.toBe(0)
    expect(rejected.stderr).toContain("Mixed pcb_spice")
    expect(await readFile(join(projectDir, "solver.log"), "utf8")).toBe(log)
    const failed = await run(
      ["circuit.json", "--modeling", "modeling.json", "--output", "failed"],
      { RECORDED_SOLVER_FAILURE: "1" },
    )
    expect(failed.exitCode).not.toBe(0)
    expect(failed.stderr).toContain("recorded solver failure")
  } finally {
    await rm(projectDir, { recursive: true, force: true })
  }
}, 30_000)
