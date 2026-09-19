import { expect, test } from "bun:test"
import { resolveXRayElementIds } from "lib/shared/render-pcb-svg"
import { scene } from "../fixtures/x-ray-scene"

test("X-Ray resolves names, display names, and element IDs to entire nets", () => {
  const expected = [
    "bottom_pad_a",
    "cross_bottom",
    "cross_inner1",
    "cross_top",
    "pad_a",
    "plated_a",
    "trace_a_bottom",
    "trace_a_inner1",
    "trace_a_top",
    "via_a",
  ].sort()
  expect(resolveXRayElementIds(scene, ["CLK"]).sort()).toEqual(expected)
  expect(resolveXRayElementIds(scene, ["pad_a"]).sort()).toEqual(expected)
  expect(resolveXRayElementIds(scene, ["source_a", "CLK"]).sort()).toEqual(
    expected,
  )
  const both = resolveXRayElementIds(scene, ["CLK", "U1.1 to U2.2"])
  expect(both).toContain("trace_b_bottom")
  expect(both).toContain("via_a")
  expect(both).toContain("plated_b")
  expect(both).not.toContain("board")
})
test("X-Ray rejects unknown and ambiguous names", () => {
  expect(() => resolveXRayElementIds(scene, ["missing"])).toThrow(
    "No connected PCB net",
  )
  const ambiguous = scene.map((el) =>
    el.type === "source_trace" ? { ...el, name: "same" } : el,
  )
  expect(() => resolveXRayElementIds(ambiguous, ["same"])).toThrow("ambiguous")
  expect(resolveXRayElementIds(ambiguous, ["source_a"])).toContain("pad_a")
})
