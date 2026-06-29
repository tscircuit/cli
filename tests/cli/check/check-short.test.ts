import { expect, test } from "bun:test"
import "bun-match-svg"
import type { PlatformConfig } from "@tscircuit/props"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { access, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { analyzeShorts } from "../../../cli/check/short/check-short"
import { getCircuitJsonForCheck } from "../../../cli/check/shared"
import { getCliTestFixture } from "../../fixtures/get-cli-test-fixture"

const makeCircuitJson = ({ withShort }: { withShort: boolean }) => [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
    thickness: 1.4,
    num_layers: 2,
  },
  {
    type: "source_trace",
    source_trace_id: "source_trace_a",
    connected_source_port_ids: [],
    connected_source_net_ids: [],
    subcircuit_connectivity_map_key: "NET_A",
  },
  {
    type: "source_trace",
    source_trace_id: "source_trace_b",
    connected_source_port_ids: [],
    connected_source_net_ids: [],
    subcircuit_connectivity_map_key: "NET_B",
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "pcb_trace_a",
    source_trace_id: "source_trace_a",
    route: [
      { route_type: "wire", x: -1, y: 0, width: 0.2, layer: "top" },
      { route_type: "wire", x: 1, y: 0, width: 0.2, layer: "top" },
    ],
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "pcb_trace_b",
    source_trace_id: "source_trace_b",
    route: [
      {
        route_type: "wire",
        x: 0,
        y: withShort ? -1 : 1,
        width: 0.2,
        layer: "top",
      },
      {
        route_type: "wire",
        x: 0,
        y: withShort ? 1 : 2,
        width: 0.2,
        layer: "top",
      },
    ],
  },
]

const makeCopperPourCircuitJson = () => [
  {
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
    thickness: 1.4,
    num_layers: 2,
  },
  {
    type: "source_trace",
    source_trace_id: "source_trace_a",
    connected_source_port_ids: [],
    connected_source_net_ids: [],
    subcircuit_connectivity_map_key: "NET_A",
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "pcb_trace_a",
    source_trace_id: "source_trace_a",
    route: [
      { route_type: "wire", x: -1, y: 0, width: 0.2, layer: "top" },
      { route_type: "wire", x: 1, y: 0, width: 0.2, layer: "top" },
    ],
  },
  {
    type: "pcb_copper_pour",
    pcb_copper_pour_id: "pcb_copper_pour_b",
    shape: "polygon",
    layer: "top",
    source_net_id: "NET_B",
    points: [
      { x: -0.25, y: -0.25 },
      { x: 0.25, y: -0.25 },
      { x: 0.25, y: 0.25 },
      { x: -0.25, y: 0.25 },
    ],
  },
]

const blinkBuddyU2CopperPourShortCircuitCode = `
const u2Footprint = (
  <footprint>
    <smtpad
      portHints={["pin1", "GND"]}
      shape="pill"
      pcbX={-4.445}
      pcbY={-2.872486}
      width={0.5599938}
      height={1.7450054}
      radius={0.2799969}
      coveredWithSolderMask={false}
    />
    <smtpad
      portHints={["pin2", "TXD"]}
      shape="pill"
      pcbX={-3.175}
      pcbY={-2.872486}
      width={0.5599938}
      height={1.7450054}
      radius={0.2799969}
      coveredWithSolderMask={false}
    />
    <smtpad
      portHints={["pin3", "RXD"]}
      shape="pill"
      pcbX={-1.905}
      pcbY={-2.872486}
      width={0.5599938}
      height={1.7450054}
      radius={0.2799969}
      coveredWithSolderMask={false}
    />
    <smtpad
      portHints={["pin4", "V3"]}
      shape="pill"
      pcbX={-0.635}
      pcbY={-2.872486}
      width={0.5599938}
      height={1.7450054}
      radius={0.2799969}
      coveredWithSolderMask={false}
    />
    <smtpad
      portHints={["pin5", "D_POS"]}
      shape="pill"
      pcbX={0.635}
      pcbY={-2.872486}
      width={0.5599938}
      height={1.7450054}
      radius={0.2799969}
      coveredWithSolderMask={false}
    />
    <smtpad
      portHints={["pin6", "D_NEG"]}
      shape="pill"
      pcbX={1.905}
      pcbY={-2.872486}
      width={0.5599938}
      height={1.7450054}
      radius={0.2799969}
      coveredWithSolderMask={false}
    />
    <smtpad
      portHints={["pin7"]}
      shape="pill"
      pcbX={3.175}
      pcbY={-2.872486}
      width={0.5599938}
      height={1.7450054}
      radius={0.2799969}
      coveredWithSolderMask={false}
    />
    <smtpad
      portHints={["pin8", "OUT"]}
      shape="pill"
      pcbX={4.445}
      pcbY={-2.872486}
      width={0.5599938}
      height={1.7450054}
      radius={0.2799969}
      coveredWithSolderMask={false}
    />
    <smtpad
      portHints={["pin9", "CTS"]}
      shape="pill"
      pcbX={4.445}
      pcbY={2.872486}
      width={0.5599938}
      height={1.7450054}
      radius={0.2799969}
      coveredWithSolderMask={false}
    />
    <smtpad
      portHints={["pin10", "DSR"]}
      shape="pill"
      pcbX={3.175}
      pcbY={2.872486}
      width={0.5599938}
      height={1.7450054}
      radius={0.2799969}
      coveredWithSolderMask={false}
    />
    <smtpad
      portHints={["pin11", "RI"]}
      shape="pill"
      pcbX={1.905}
      pcbY={2.872486}
      width={0.5599938}
      height={1.7450054}
      radius={0.2799969}
      coveredWithSolderMask={false}
    />
    <smtpad
      portHints={["pin12", "DCD"]}
      shape="pill"
      pcbX={0.635}
      pcbY={2.872486}
      width={0.5599938}
      height={1.7450054}
      radius={0.2799969}
      coveredWithSolderMask={false}
    />
    <smtpad
      portHints={["pin13", "DTR"]}
      shape="pill"
      pcbX={-0.635}
      pcbY={2.872486}
      width={0.5599938}
      height={1.7450054}
      radius={0.2799969}
      coveredWithSolderMask={false}
    />
    <smtpad
      portHints={["pin14", "RTS"]}
      shape="pill"
      pcbX={-1.905}
      pcbY={2.872486}
      width={0.5599938}
      height={1.7450054}
      radius={0.2799969}
      coveredWithSolderMask={false}
    />
    <smtpad
      portHints={["pin15", "R232"]}
      shape="pill"
      pcbX={-3.175}
      pcbY={2.872486}
      width={0.5599938}
      height={1.7450054}
      radius={0.2799969}
      coveredWithSolderMask={false}
    />
    <smtpad
      portHints={["pin16", "VCC"]}
      shape="pill"
      pcbX={-4.445}
      pcbY={2.872486}
      width={0.5599938}
      height={1.7450054}
      radius={0.2799969}
      coveredWithSolderMask={false}
    />
  </footprint>
)

export default () => (
  <board width={14} height={10}>
    <chip
      name="U2"
      manufacturerPartNumber="CH340C"
      footprint={u2Footprint}
      pinLabels={{
        pin1: "GND",
        pin2: "TXD",
        pin3: "RXD",
        pin4: "V3",
        pin5: "D_POS",
        pin6: "D_NEG",
        pin8: "OUT",
        pin9: "CTS",
        pin10: "DSR",
        pin11: "RI",
        pin12: "DCD",
        pin13: "DTR",
        pin14: "RTS",
        pin15: "R232",
        pin16: "VCC",
      }}
      pcbX={0}
      pcbY={0}
    />
    <resistor
      name="R_SAFE"
      resistance="10k"
      footprint="0402"
      pcbX={5}
      pcbY={0}
    />
    <copperpour
      layer="top"
      connectsTo="net.GND"
      padMargin={0.25}
      traceMargin={0.25}
      boardEdgeMargin={0}
      outline={[
        { x: -7, y: -5 },
        { x: 7, y: -5 },
        { x: 7, y: 5 },
        { x: -7, y: 5 },
      ]}
    />
  </board>
)
`

test("tsci check short generates gerbers and passes when nets do not touch", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "no-short.circuit.json")
  const outputPath = path.join(tmpDir, "no-short.circuit-gerbers.zip")

  await writeFile(
    circuitPath,
    JSON.stringify(makeCircuitJson({ withShort: false }), null, 2),
  )

  const { stdout, stderr, exitCode } = await runCommand(
    `tsci check short ${circuitPath}`,
  )

  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(stdout).toContain(`Gerbers: ${outputPath}`)
  expect(stdout).toContain("Shorts: 0")
  await expect(access(outputPath)).resolves.toBeNull()
}, 20_000)

test("tsci check short fails when copper from different nets touches", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "shorted.circuit.json")
  const outputPath = path.join(tmpDir, "shorted.circuit-gerbers.zip")

  await writeFile(
    circuitPath,
    JSON.stringify(makeCircuitJson({ withShort: true }), null, 2),
  )

  const { stdout, stderr, exitCode } = await runCommand(
    `tsci check short ${circuitPath}`,
  )

  expect(exitCode).toBe(1)
  expect(stderr).toBe("")
  expect(stdout).toContain(`Gerbers: ${outputPath}`)
  expect(stdout).toContain("Shorts: 1")
  expect(stdout).toContain(
    "pcb_trace pcb_trace_a (NET_A) touches pcb_trace pcb_trace_b (NET_B)",
  )
  await expect(access(outputPath)).resolves.toBeNull()
}, 20_000)

test("tsci check short includes copper pours in short detection", async () => {
  const { tmpDir, runCommand } = await getCliTestFixture()
  const circuitPath = path.join(tmpDir, "pour-shorted.circuit.json")
  const outputPath = path.join(tmpDir, "pour-shorted.circuit-gerbers.zip")

  await writeFile(
    circuitPath,
    JSON.stringify(makeCopperPourCircuitJson(), null, 2),
  )

  const { stdout, stderr, exitCode } = await runCommand(
    `tsci check short ${circuitPath}`,
  )

  expect(exitCode).toBe(1)
  expect(stderr).toBe("")
  expect(stdout).toContain(`Gerbers: ${outputPath}`)
  expect(stdout).toContain("Shorts: 1")
  expect(stdout).toContain("pcb_trace pcb_trace_a (NET_A)")
  expect(stdout).toContain("pcb_copper_pour pcb_copper_pour_b (NET_B)")
  await expect(access(outputPath)).resolves.toBeNull()
}, 20_000)

test("tsci check short catches three differently sized post-pour traces shorted to a full-board copper pour", async () => {
  const { runCommand } = await getCliTestFixture()
  const fileStem = `blinkbuddy-u2-pour-short-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`
  const circuitPath = path.join(process.cwd(), `${fileStem}.circuit.tsx`)
  const shortedCircuitJsonPath = path.join(
    process.cwd(),
    `${fileStem}.shorted.circuit.json`,
  )
  const outputPath = path.join(
    process.cwd(),
    `${fileStem}.shorted.circuit-gerbers.zip`,
  )

  try {
    await writeFile(circuitPath, blinkBuddyU2CopperPourShortCircuitCode)

    const circuitJson = await getCircuitJsonForCheck({
      filePath: circuitPath,
      platformConfig: {
        pcbDisabled: false,
        routingDisabled: false,
      } satisfies PlatformConfig,
    })
    const manualShorts = [
      {
        id: "manual_txd_stub",
        netKey: "U2_TXD_STUB",
        route: [
          { route_type: "wire", x: -3.175, y: -4.7, width: 0.18, layer: "top" },
          {
            route_type: "wire",
            x: -3.175,
            y: -4.15,
            width: 0.18,
            layer: "top",
          },
        ],
      },
      {
        id: "manual_left_edge_stub",
        netKey: "LEFT_EDGE_STUB",
        route: [
          { route_type: "wire", x: -6.4, y: -1.2, width: 0.12, layer: "top" },
          { route_type: "wire", x: -6.4, y: -0.2, width: 0.12, layer: "top" },
        ],
      },
      {
        id: "manual_top_right_stub",
        netKey: "TOP_RIGHT_STUB",
        route: [
          { route_type: "wire", x: 5.45, y: 4.25, width: 0.32, layer: "top" },
          { route_type: "wire", x: 6.35, y: 4.25, width: 0.32, layer: "top" },
        ],
      },
    ]
    const shortedCircuitJson = [
      ...circuitJson,
      ...manualShorts.flatMap((manualShort) => [
        {
          type: "source_trace",
          source_trace_id: `source_trace_${manualShort.id}`,
          connected_source_port_ids: [],
          connected_source_net_ids: [],
          subcircuit_connectivity_map_key: manualShort.netKey,
        },
        {
          type: "pcb_trace",
          pcb_trace_id: `pcb_trace_${manualShort.id}`,
          source_trace_id: `source_trace_${manualShort.id}`,
          route: manualShort.route,
        },
      ]),
    ]
    await writeFile(
      shortedCircuitJsonPath,
      JSON.stringify(shortedCircuitJson, null, 2),
    )

    const { stdout, stderr, exitCode } = await runCommand(
      `tsci check short ${shortedCircuitJsonPath}`,
    )

    expect(exitCode).toBe(1)
    expect(stderr).toBe("")
    expect(stdout).toContain(`Gerbers: ${outputPath}`)
    expect(stdout).toContain("Shorts: 3")
    for (const manualShort of manualShorts) {
      expect(stdout).toContain(`pcb_trace pcb_trace_${manualShort.id}`)
    }
    expect(stdout).toContain("pcb_copper_pour")

    const shorts = analyzeShorts(shortedCircuitJson as any)
    expect(shorts).toHaveLength(3)
    const shortIds = shorts.map((short) => [short.firstId, short.secondId])
    for (const manualShort of manualShorts) {
      expect(
        shortIds.some((ids) => ids.includes(`pcb_trace_${manualShort.id}`)),
      ).toBe(true)
    }
    for (const short of shorts) {
      expect([short.firstType, short.secondType]).toContain("pcb_copper_pour")
    }

    const circuitRecords = shortedCircuitJson as any[]
    const board = circuitRecords.find((elm) => elm.type === "pcb_board")
    const u2SourceComponent = circuitRecords.find(
      (elm) => elm.type === "source_component" && elm.name === "U2",
    )
    const safeSourceComponent = circuitRecords.find(
      (elm) => elm.type === "source_component" && elm.name === "R_SAFE",
    )
    const u2PcbComponent = circuitRecords.find(
      (elm) =>
        elm.type === "pcb_component" &&
        elm.source_component_id === u2SourceComponent.source_component_id,
    )
    const safePcbComponent = circuitRecords.find(
      (elm) =>
        elm.type === "pcb_component" &&
        elm.source_component_id === safeSourceComponent.source_component_id,
    )
    const componentPads = circuitRecords.filter(
      (elm: any) => elm.type === "pcb_smtpad" && elm.pcb_component_id,
    )
    const u2Pads = componentPads.filter(
      (pad) => pad.pcb_component_id === u2PcbComponent.pcb_component_id,
    )
    const safePads = componentPads.filter(
      (pad) => pad.pcb_component_id === safePcbComponent.pcb_component_id,
    )
    expect(componentPads).toHaveLength(18)
    expect(u2Pads).toHaveLength(16)
    expect(safePads).toHaveLength(2)
    for (const safePad of safePads) {
      for (const short of shorts) {
        expect([short.firstId, short.secondId]).not.toContain(
          safePad.pcb_smtpad_id,
        )
      }
    }
    for (const pad of componentPads) {
      expect(pad.x - pad.width / 2).toBeGreaterThanOrEqual(
        board.center.x - board.width / 2,
      )
      expect(pad.x + pad.width / 2).toBeLessThanOrEqual(
        board.center.x + board.width / 2,
      )
      expect(pad.y - pad.height / 2).toBeGreaterThanOrEqual(
        board.center.y - board.height / 2,
      )
      expect(pad.y + pad.height / 2).toBeLessThanOrEqual(
        board.center.y + board.height / 2,
      )
    }

    const pcbSvg = convertCircuitJsonToPcbSvg(shortedCircuitJson as any, {
      layer: "top",
      width: 500,
      height: 420,
    })
    expect(pcbSvg.match(/class="pcb-pad"/g)).toHaveLength(18)
    expect(pcbSvg).toMatchSvgSnapshot(
      import.meta.path,
      "check-short-three-post-pour-traces",
    )

    await expect(access(outputPath)).resolves.toBeNull()
  } finally {
    await rm(circuitPath, { force: true })
    await rm(shortedCircuitJsonPath, { force: true })
    await rm(outputPath, { force: true })
  }
}, 20_000)
