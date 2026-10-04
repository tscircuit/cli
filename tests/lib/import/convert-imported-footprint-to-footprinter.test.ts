import { expect, test } from "bun:test"
import { fp } from "@tscircuit/footprinter"
import { source_port } from "circuit-json"
import type {
  AnyCircuitElement,
  PcbPort,
  PcbSmtPad,
  SourcePort,
} from "circuit-json"
import { rm, symlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { convertImportedFootprintToFootprinter } from "lib/import/footprinter/convert-imported-footprint-to-footprinter"
import { generateCircuitJson } from "lib/shared/generate-circuit-json"
import { temporaryDirectory } from "tempy"

test("compacts an identity pin map without adding aliases", () => {
  const circuitJson = fp.string("sot23").circuitJson() as AnyCircuitElement[]
  const exactTsx = `
const pinLabels = { pin1: ["IN"], pin2: ["GND"], pin3: ["VCC"] } as const
export const TestChip = () => (
  <chip
    name="U1"
    pinLabels={pinLabels}
    pinAttributes={{ pin1: { isInput: true }, pin2: { requiresGround: true }, pin3: { requiresPower: true } }}
    footprint={<footprint><smtpad /></footprint>}
  />
)
`

  const result = convertImportedFootprintToFootprinter({
    circuitJson,
    sourceHints: ["SOT-23"],
    tsx: exactTsx,
  })

  expect(result.mode).toBe("footprinter")
  expect(result.accuracy).toBeGreaterThan(0.98)
  expect(result.tsx).toContain('footprint="sot23')
  expect(result.tsx).toContain("pinLabels={pinLabels}")
  expect(result.tsx).not.toContain("footprinterPinLabels")
  expect(result.tsx).toContain(
    "pinAttributes={{ pin1: { isInput: true }, pin2: { requiresGround: true }, pin3: { requiresPower: true } }}",
  )
})

test("preserves exact geometry and distinct attributes when compact pin aliases would collide", async () => {
  const circuitJson = fp.string("sot23").circuitJson() as AnyCircuitElement[]
  const pads = circuitJson.filter(
    (element): element is PcbSmtPad => element.type === "pcb_smtpad",
  )
  // Identical copper geometry, but the supplier's physical pin ordering differs.
  const swappedPins = { "1": "pin2", "2": "pin3", "3": "pin1" }
  for (const pad of pads) {
    pad.port_hints = [
      swappedPins[pad.port_hints![0] as keyof typeof swappedPins],
    ]
  }
  const exactPads = pads
    .map((pad) => {
      if (pad.shape !== "rect") throw new Error("Expected rectangular pads")
      return `<smtpad portHints={[${JSON.stringify(pad.port_hints![0])}]} pcbX={${pad.x}} pcbY={${pad.y}} width={${pad.width}} height={${pad.height}} shape="rect" />`
    })
    .join("\n")
  const exactTsx = `
const pinLabels = { pin1: ["IN"], pin2: ["GND"], pin3: ["VCC"] } as const
export const TestChip = () => (
  <chip
    name="U1"
    pinLabels={pinLabels}
    pinAttributes={{ pin1: { isInput: true, capabilities: ["uart_rx"] }, pin2: { requiresGround: true }, pin3: { requiresPower: true, requiresVoltage: "1.8V" } }}
    footprint={<footprint>${exactPads}</footprint>}
  />
)
`
  const result = convertImportedFootprintToFootprinter({
    circuitJson,
    sourceHints: ["SOT-23"],
    tsx: exactTsx,
  })

  expect(result.accuracy).toBeGreaterThan(0.98)
  expect(result.mode).toBe("exact-pin-conflict")
  expect(result.tsx).toBe(exactTsx)

  const tmpDir = temporaryDirectory()
  try {
    await symlink(
      path.join(process.cwd(), "node_modules"),
      path.join(tmpDir, "node_modules"),
      "dir",
    )
    const filePath = path.join(tmpDir, "TestChip.tsx")
    await writeFile(filePath, result.tsx)
    const rendered = await generateCircuitJson({ filePath })
    for (const [pin, attribute] of [
      [1, "supports_uart_rx"],
      [2, "requires_ground"],
      [3, "requires_power"],
    ] as const) {
      const port = rendered.circuitJson.find(
        (element) =>
          element.type === "source_port" && element.pin_number === pin,
      ) as SourcePort
      expect(port).toBeDefined()
      expect(port[attribute]).toBe(true)
      for (const otherAttribute of [
        "supports_uart_rx",
        "requires_ground",
        "requires_power",
      ] as const) {
        if (otherAttribute !== attribute)
          expect(port[otherAttribute]).not.toBe(true)
      }
      expect(source_port.parse(port).requires_voltage).toBe(
        pin === 3 ? 1.8 : undefined,
      )

      const pcbPort = rendered.circuitJson.find(
        (element) =>
          element.type === "pcb_port" &&
          element.source_port_id === port.source_port_id,
      ) as PcbPort
      const renderedPad = rendered.circuitJson.find(
        (element) =>
          element.type === "pcb_smtpad" &&
          element.pcb_port_id === pcbPort.pcb_port_id,
      ) as PcbSmtPad
      const originalPad = pads.find((pad) =>
        pad.port_hints?.includes(`pin${pin}`),
      )!
      expect(renderedPad.shape).toBe("rect")
      if (renderedPad.shape !== "rect" || originalPad.shape !== "rect")
        throw new Error("Expected rectangular pads")
      expect(renderedPad.x).toBeCloseTo(originalPad.x)
      expect(renderedPad.y).toBeCloseTo(originalPad.y)
      expect(renderedPad.width).toBeCloseTo(originalPad.width)
      expect(renderedPad.height).toBeCloseTo(originalPad.height)
    }
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
})

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

test("keeps the exact footprint when copper IoU is at or below 98%", () => {
  const circuitJson = fp
    .string("res_p1.3mm_pw0.55mm_ph0.7mm")
    .circuitJson() as AnyCircuitElement[]
  const firstPad = circuitJson.find((element) => element.type === "pcb_smtpad")
  if (!firstPad || firstPad.type !== "pcb_smtpad") {
    throw new Error("Expected an SMT pad")
  }
  if (firstPad.shape !== "rect") {
    throw new Error("Expected a rectangular SMT pad")
  }
  const circlePad: PcbSmtPad = {
    ...firstPad,
    shape: "circle",
    radius: Math.min(firstPad.width, firstPad.height) / 2,
  }
  circuitJson[circuitJson.indexOf(firstPad)] = circlePad
  const exactTsx = "<chip footprint={<footprint><smtpad /></footprint>} />"

  const result = convertImportedFootprintToFootprinter({
    circuitJson,
    tsx: exactTsx,
  })

  expect(result.mode).toBe("exact-low-accuracy")
  expect(result.accuracy).toBeLessThanOrEqual(0.98)
  expect(result.tsx).toBe(exactTsx)
})
