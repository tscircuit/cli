import "bun-match-svg"
import { expect, test } from "bun:test"
import { rm, symlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { fp } from "@tscircuit/footprinter"
import type {
  AnyCircuitElement,
  PcbPort,
  PcbSmtPad,
  SourcePort,
} from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { convertImportedFootprintToFootprinter } from "lib/import/footprinter/convert-imported-footprint-to-footprinter"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { temporaryDirectory } from "tempy"

test("compacts a >98% footprint and preserves a renamed thermal-pad pin", async () => {
  const circuitJson = fp
    .string("qfn56_w7_h7_p0.4_pw0.2_pl0.85_thermalpad3.1mmx3.1mm")
    .circuitJson() as AnyCircuitElement[]
  const thermalPad = circuitJson.find(
    (element) =>
      element.type === "pcb_smtpad" &&
      element.port_hints?.includes("thermalpad"),
  )
  if (!thermalPad || thermalPad.type !== "pcb_smtpad") {
    throw new Error("Expected a thermal pad")
  }
  thermalPad.port_hints = ["pin57"]

  const exactTsx = `
const pinLabels = {
  pin57: ["GND"],
} as const

export const TestChip = () => (
  <chip
    name="U1"
    pinLabels={pinLabels}
    footprint={<footprint><smtpad portHints={["pin57"]} /></footprint>}
    cadModel={{ stepUrl: "https://example.com/model.step" }}
  />
)
`
  const result = convertImportedFootprintToFootprinter({
    circuitJson,
    sourceHints: ["QFN-56"],
    tsx: exactTsx,
  })

  expect(result.mode).toBe("footprinter")
  expect(result.accuracy).toBeGreaterThan(0.98)
  expect(result.tsx).toContain('footprint="qfn56_thermalpad3.1mmx3.1mm')
  expect(result.tsx).toContain('"pin57": [...pinLabels["pin57"], "thermalpad"]')
  expect(result.tsx).toContain("pinLabels={footprinterPinLabels}")
  expect(result.tsx).toContain(
    'cadModel={{ stepUrl: "https://example.com/model.step" }}',
  )
  expect(result.tsx).not.toContain("footprint={<footprint>")

  const tmpDir = temporaryDirectory()
  const componentPath = path.join(tmpDir, "TestChip.tsx")
  try {
    await symlink(
      path.join(process.cwd(), "node_modules"),
      path.join(tmpDir, "node_modules"),
      "dir",
    )
    await writeFile(componentPath, result.tsx)
    const rendered = await generateCircuitJson({ filePath: componentPath })
    const sourcePort = rendered.circuitJson.find(
      (element) => element.type === "source_port" && element.pin_number === 57,
    ) as SourcePort | undefined
    const pcbPort = rendered.circuitJson.find(
      (element) =>
        element.type === "pcb_port" &&
        element.source_port_id === sourcePort?.source_port_id,
    ) as PcbPort | undefined
    const thermalPad = rendered.circuitJson.find(
      (element) =>
        element.type === "pcb_smtpad" &&
        element.pcb_port_id === pcbPort?.pcb_port_id,
    ) as PcbSmtPad | undefined

    expect(sourcePort?.name).toBe("GND")
    expect(thermalPad?.port_hints).toContain("thermalpad")
    expect(thermalPad?.shape).toBe("rect")
    if (thermalPad?.shape !== "rect") {
      throw new Error("Expected a rectangular thermal pad")
    }
    expect(thermalPad.width).toBe(3.1)
    expect(thermalPad.height).toBe(3.1)
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
})

test("compacts C2871569 while preserving its 4x4 thermal-via array", () => {
  const circuitJson = fp
    .string(
      "qfn64_thermalpad6.3mmx6.3mm_thermalvias4x4_thermalviapitch1mm_thermalviaid0.3048mm_thermalviaod0.6096mm_pillpads_h9.67mm_pw0.28mm_pl0.66mm",
    )
    .circuitJson() as AnyCircuitElement[]
  const exactTsx =
    "<chip footprint={<footprint><smtpad /><via /></footprint>} />"

  const result = convertImportedFootprintToFootprinter({
    circuitJson,
    sourceHints: ["C2871569", "QFN-64"],
    tsx: exactTsx,
  })

  expect(result.mode).toBe("footprinter")
  expect(result.candidate?.footprinterString).toContain("_thermalvias4x4")
  expect(result.candidate?.footprinterString).toContain("_thermalviapitch1mm")
  expect(result.candidate?.footprinterString).toContain("_thermalviaid0.3048mm")
  expect(result.candidate?.footprinterString).toContain("_thermalviaod0.6096mm")
  expect(result.candidate?.holeIntersectionOverUnion).toBeGreaterThan(0.99)
  expect(result.tsx).not.toContain("footprint={<footprint>")

  const recoveredCircuitJson = fp
    .string(result.candidate!.footprinterString)
    .circuitJson()
  expect(
    recoveredCircuitJson.filter((element) => element.type === "pcb_via"),
  ).toHaveLength(16)
  expect(convertCircuitJsonToPcbSvg(recoveredCircuitJson)).toMatchSvgSnapshot(
    import.meta.path,
    "C2871569-thermal-vias",
  )
})

test("keeps the exact footprint when copper IoU is at or below 98%", () => {
  const circuitJson = fp
    .string("res_p1.3mm_pw0.55mm_ph0.7mm")
    .circuitJson() as AnyCircuitElement[]
  const firstPad = circuitJson.find((element) => element.type === "pcb_smtpad")
  if (!firstPad || firstPad.type !== "pcb_smtpad") {
    throw new Error("Expected an SMT pad")
  }
  Object.assign(firstPad, { radius: 0.1, shape: "circle" as const })
  const exactTsx = "<chip footprint={<footprint><smtpad /></footprint>} />"

  const result = convertImportedFootprintToFootprinter({
    circuitJson,
    tsx: exactTsx,
  })

  expect(result.mode).toBe("exact-low-accuracy")
  expect(result.accuracy).toBeLessThanOrEqual(0.98)
  expect(result.tsx).toBe(exactTsx)
})
