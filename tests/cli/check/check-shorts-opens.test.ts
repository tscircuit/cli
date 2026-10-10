import { expect, test } from "bun:test"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import fixture from "../../fixtures/disconnected-pcb-net.circuit.json"

test("tsci check shorts fails checks #402's open net and passes its copper-bridge repair", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "tsci-open-net-"))
  const original = path.join(dir, "original.circuit.json")
  const repaired = path.join(dir, "repaired.circuit.json")
  const cli = path.resolve("cli/main.ts")
  const run = async (file: string, mode: string) => {
    const child = Bun.spawn(
      [process.execPath, cli, "check", "shorts", file, "--mode", mode],
      {
        cwd: dir,
        env: { ...process.env, TSCI_TEST_MODE: "true", NODE_ENV: "test" },
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
  try {
    await writeFile(original, JSON.stringify(fixture))
    const existingTrace = fixture.find((e) => e.type === "pcb_trace")!
    await writeFile(
      repaired,
      JSON.stringify([
        ...fixture,
        {
          type: "pcb_trace",
          pcb_trace_id: "repair_bridge",
          source_trace_id: existingTrace.source_trace_id,
          route: [
            { route_type: "wire", x: -2, y: 0, width: 0.3, layer: "top" },
            { route_type: "wire", x: 2, y: 0, width: 0.3, layer: "top" },
          ],
        },
      ]),
    )
    for (const mode of ["gerber", "pcb"]) {
      const broken = await run(original, mode)
      expect(broken.exitCode).toBe(1)
      expect(broken.stderr).toBe("")
      expect(broken.stdout).toContain("No shorts detected")
      expect(broken.stdout).toContain("Detected 1 open")
      expect(broken.stdout).toContain("A.pin1, B.pin1 | C.pin1, D.pin1")
      const svg = await readFile(
        path.join(dir, "checks/check-shorts/pcb.svg"),
        "utf8",
      )
      expect(svg).toContain("OPEN GND")
      const fixed = await run(repaired, mode)
      expect(fixed.exitCode).toBe(0)
      expect(fixed.stderr).toBe("")
      expect(fixed.stdout).toContain("no opens detected")
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}, 30_000)
