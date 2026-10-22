import { expect, test } from "bun:test"
import { generateKicadProject } from "cli/build/generate-kicad-project"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { Circuit } from "tscircuit"

test("generated KiCad projects preserve font metrics and stroke thickness for silkscreen text (#4719)", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board width="10.4mm" height="10.4mm">
      <silkscreentext
        text="SN74LVC1G17DCKR"
        pcbX={0}
        pcbY={0}
        fontSize={0.8}
        layer="top"
      />
      <silkscreentext
        text="BOTTOM_LABEL"
        pcbX={0}
        pcbY={-3}
        fontSize={0.8}
        layer="bottom"
      />
      <resistor name="R1" resistance="10k" footprint="0402" pcbX={2} pcbY={2} />
    </board>,
  )
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()

  const dir = await mkdtemp(path.join(tmpdir(), "tsci-kicad-silk-"))
  try {
    const result = await generateKicadProject({
      circuitJson,
      outputDir: path.join(dir, "my-board"),
      projectName: "my-board",
      writeFiles: true,
    })

    // Standalone top silkscreen text with fontSize=0.8 should export with
    // native text height (0.8), character width fitted to source preview (0.48),
    // and stroke thickness 0.10 mm instead of oversized 0.15 mm (#4719)
    expect(result.pcbContent).toContain('"SN74LVC1G17DCKR"')
    expect(result.pcbContent).toContain("(size 0.8 0.48)")
    expect(result.pcbContent).toContain("(thickness 0.1)")

    // Standalone bottom silkscreen text should also be normalized on B.SilkS
    expect(result.pcbContent).toContain('"BOTTOM_LABEL"')
    expect(result.pcbContent).toContain("(layer B.SilkS)")

    // Footprint silkscreen reference text (R1) should have normalized metrics
    expect(result.pcbContent).toContain("reference")
    expect(result.pcbContent).toContain('"R1"')

    // Verify written file on disk matches memory content
    const writtenPcb = await readFile(
      path.join(dir, "my-board", "my-board.kicad_pcb"),
      "utf8",
    )
    expect(writtenPcb).toBe(result.pcbContent)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
