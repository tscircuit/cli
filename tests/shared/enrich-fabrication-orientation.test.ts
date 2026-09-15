import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { enrichFabricationOrientation } from "lib/shared/enrich-fabrication-orientation"

function fixture(rotation = 0): AnyCircuitElement[] {
  const a = (rotation * Math.PI) / 180
  return [
    {
      type: "source_component",
      source_component_id: "s",
      ftype: "simple_chip",
      name: "Q1",
      supplier_part_numbers: { jlcpcb: ["C85202"] },
    },
    {
      type: "pcb_component",
      pcb_component_id: "p",
      source_component_id: "s",
      center: { x: 10, y: 20 },
      width: 3,
      height: 3,
      rotation,
      layer: "top",
    },
    ...[
      [-1, 1],
      [-1, -1],
      [1, 0],
    ].map(([x, y], i) => ({
      type: "pcb_smtpad",
      pcb_smtpad_id: `pad${i}`,
      pcb_component_id: "p",
      shape: "rect",
      layer: "top",
      width: 1,
      height: 0.6,
      x: 10 + x * Math.cos(a) - y * Math.sin(a),
      y: 20 + x * Math.sin(a) + y * Math.cos(a),
      port_hints: [`pin${i + 1}`],
    })),
  ] as AnyCircuitElement[]
}
const supplier = fixture()
  .filter((e) => e.type === "pcb_smtpad" && e.shape === "rect")
  .map((e) => ({ ...e, x: -(e.x - 10), y: -(e.y - 20) }))
const platform = {
  partsEngine: {
    findPart: async () => ({}),
    fetchPartCircuitJson: async () => supplier,
  },
}

test("derives the unrotated frame without changing input or copper geometry", async () => {
  const input = fixture(90),
    before = structuredClone(input),
    warnings: string[] = []
  const output = await enrichFabricationOrientation(input, platform, (m) =>
    warnings.push(m),
  )
  expect(input).toEqual(before)
  expect(warnings).toEqual([])
  const pcb = output.find((e) => e.type === "pcb_component")!
  expect(pcb.pin1_location).toBe("leftside_top")
  expect(pcb.supplier_pin1_location_map?.jlcpcb).toBe("rightside_bottom")
  const { pin1_location, supplier_pin1_location_map, ...geometry } = pcb
  expect(geometry).toEqual(input.find((e) => e.type === "pcb_component")!)
  expect(output.filter((e) => e.type !== "pcb_component")).toEqual(
    input.filter((e) => e.type !== "pcb_component"),
  )
})

test("reuses existing frames and skips DNP without supplier fetches", async () => {
  const input = fixture()
  Object.assign(input[1], {
    pin1_location: "leftside_top",
    supplier_pin1_location_map: { jlcpcb: "rightside_bottom" },
  })
  let fetches = 0
  const config = {
    partsEngine: {
      findPart: async () => ({}),
      fetchPartCircuitJson: async () => {
        fetches++
        throw new Error("unexpected fetch")
      },
    },
  }
  expect(await enrichFabricationOrientation(input, config)).toEqual(input)
  const dnp = fixture()
  Object.assign(dnp[1], { do_not_place: true })
  expect(await enrichFabricationOrientation(dnp, config)).toEqual(dnp)
  expect(fetches).toBe(0)
})

test("warns on lookup failures and ambiguous bottom-side frames", async () => {
  const warnings: string[] = []
  await enrichFabricationOrientation(
    fixture(),
    {
      partsEngine: {
        findPart: async () => ({}),
        fetchPartCircuitJson: async () => {
          throw new Error("lookup unavailable")
        },
      },
    },
    (m) => warnings.push(m),
  )
  expect(warnings[0]).toContain("Q1 (C85202)")
  expect(warnings[0]).toContain("lookup unavailable")
  const bottom = fixture()
  Object.assign(bottom[1], { layer: "bottom" })
  const result = await enrichFabricationOrientation(bottom, platform, (m) =>
    warnings.push(m),
  )
  expect(result).toEqual(bottom)
  expect(warnings[1]).toContain("bottom-side footprint needs explicit")
})
