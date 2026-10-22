import { expect, test } from "bun:test"
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { buildFile } from "cli/build/build-file"
import { getPlatformConfigWithCliDefaults } from "lib/shared/get-platform-config-with-cli-defaults"
import { loadAnalogInput } from "cli/simulate/load-analog-input"
import { runAnalogSimulation } from "cli/simulate/run-analog-simulation"

test("analog uses one hook-safe project render and reuses its modeling and physical build", async () => {
  const projectDir = await mkdtemp(join(tmpdir(), "analog-render-"))
  const key = `render_${Date.now()}`
  try {
    await symlink(
      join(process.cwd(), "node_modules"),
      join(projectDir, "node_modules"),
    )
    await writeFile(join(projectDir, "package.json"), "{}")
    const file = join(projectDir, "main.circuit.tsx")
    await writeFile(
      file,
      `import { useState, useLayoutEffect, useRef } from "react"
import { analog } from "@tscircuit/core"
export const modeling = { description: "explicit model metadata" }
export default function Main() {
  const [width] = useState(10)
  const board = useRef(null)
  useLayoutEffect(() => { globalThis[${JSON.stringify(key)}] = { count: (globalThis[${JSON.stringify(key)}]?.count ?? 0) + 1, board: board.current } }, [])
  return <board ref={board} width={width} height={6}><resistor name="R1" resistance="1k" footprint="0402" /><analog.transientsimulation name="SI" duration="100ns" timePerStep="10ps" spiceEngine="pcb_spice" /></board>
}`,
    )
    const options = {
      partsEngineDisabled: true,
      schematicDisabled: true,
      routingDisabled: false,
    }
    await writeFile(
      join(projectDir, "tscircuit.config.ts"),
      `export default { platformConfig: {
      partsEngineDisabled: false, routingDisabled: false, schematicDisabled: true,
      spiceEngineMap: { sentinel: { simulate: async () => ({}) } }
    } }`,
    )
    await expect(
      runAnalogSimulation(file, { disablePartsEngine: true }),
    ).rejects.toThrow()
    expect((globalThis as any)[key].count).toBe(1)
    expect(
      (globalThis as any)[key].board.root.platform.partsEngineDisabled,
    ).toBe(true)
    expect((globalThis as any)[key].board.root.platform.routingDisabled).toBe(
      false,
    )
    expect(
      typeof (globalThis as any)[key].board.root.platform.spiceEngineMap
        .sentinel.simulate,
    ).toBe("function")
    const output = join(projectDir, "dist", "main", "circuit.json")
    const built = await buildFile(file, output, projectDir, {
      platformConfig: options,
    })
    expect(built.ok).toBe(true)
    expect((globalThis as any)[key].count).toBe(2)
    const input = {
      file,
      projectDir,
      platformConfig: getPlatformConfigWithCliDefaults(options, { projectDir }),
    }
    const cached = await loadAnalogInput(input)
    expect("cacheHit" in cached && cached.cacheHit).toBe(true)
    expect(cached.modeling?.description).toBe("explicit model metadata")
    expect(cached.circuitJson).toEqual(
      JSON.parse(await readFile(output, "utf8")),
    )
    expect((globalThis as any)[key].count).toBe(2)
    const changed = await loadAnalogInput({
      ...input,
      platformConfig: { ...input.platformConfig, routingDisabled: true },
    })
    expect("cacheHit" in changed && changed.cacheHit).toBe(false)
    expect(
      "rootCircuit" in changed &&
        changed.rootCircuit?.platform.partsEngineDisabled,
    ).toBe(true)
    expect(
      "rootCircuit" in changed && changed.rootCircuit?.platform.routingDisabled,
    ).toBe(true)
    expect(changed.modeling).toEqual(cached.modeling)
  } finally {
    delete (globalThis as any)[key]
    await rm(projectDir, { recursive: true, force: true })
  }
}, 30_000)
