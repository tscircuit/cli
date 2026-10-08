import { expect, spyOn, test } from "bun:test"
import "bun-match-svg"
import { convertCircuitJsonToPcbSvg } from "../lib/shared/render-pcb-svg"
import {
  EasyEdaJsonSchema,
  convertEasyEdaJsonToCircuitJson,
} from "easyeda/browser"
import { convertCircuitJsonToPcbSvg as renderXraySvg } from "circuit-to-svg"
import { readFile, rm } from "node:fs/promises"
import { temporaryDirectory } from "tempy"
import { importComponentFromJlcpcb } from "../lib/import/import-component-from-jlcpcb"
import rawEasy from "./fixtures/c41413180.raweasy.json"

test("JLCPCB import preserves filled RGB fabrication symbols", async () => {
  const directory = temporaryDirectory()
  const fetchMock = spyOn(globalThis, "fetch").mockImplementation(
    Object.assign(
      async (input: RequestInfo | URL) => {
        const url = new URL(String(input))
        if (url.pathname === "/api/components/search") {
          return Response.json({
            success: true,
            result: { lists: { lcsc: [rawEasy] } },
          })
        }
        if (url.pathname === `/api/components/${rawEasy.uuid}`) {
          return Response.json({ success: true, result: rawEasy })
        }
        if (url.hostname === "modelcdn.tscircuit.com")
          return new Response(null, { status: 404 })
        throw new Error(`Unexpected fetch: ${url}`)
      },
      { preconnect: fetch.preconnect },
    ),
  )
  try {
    const { filePath } = await importComponentFromJlcpcb(
      "C41413180",
      directory,
      {
        useExactFootprint: true,
        excludePinAttributes: true,
      },
    )
    const source = await readFile(filePath, "utf8")
    const paths = source.match(/<fabricationnotepath\b[^>]*\/>/g) ?? []
    expect(paths).toHaveLength(4)
    for (const path of paths) {
      expect(path).toMatch(/\bisFilled(?:\s|=\{true\})/)
      expect(path).toContain("hasStroke={false}")
      expect(path).toContain('strokeWidth="0mm"')
    }
  } finally {
    fetchMock.mockRestore()
    await rm(directory, { recursive: true, force: true })
  }
  const circuitJson = convertEasyEdaJsonToCircuitJson(
    EasyEdaJsonSchema.parse(rawEasy),
  )
  const paths = circuitJson.filter(
    (element) => element.type === "pcb_fabrication_note_path",
  )
  expect(paths).toHaveLength(4)
  for (const path of paths) {
    expect(path).toMatchObject({
      is_filled: true,
      has_stroke: false,
      stroke_width: 0,
    })
    expect(path.route.at(-1)).toEqual(path.route[0]!)
  }
  const plus = paths.find((path) => path.route.length === 13)
  if (!plus) throw new Error("Expected the supplier's plus-sign geometry")
  expect(Math.abs(plus.route[0]!.y - plus.route[1]!.y)).toBeCloseTo(0.127, 5)
  await expect(convertCircuitJsonToPcbSvg(circuitJson)).toMatchSvgSnapshot(
    import.meta.path,
  )
  const pad = circuitJson.find((element) => element.type === "pcb_smtpad")!
  await expect(
    renderXraySvg(circuitJson, { xRayElementIds: [pad.pcb_smtpad_id] }),
  ).toMatchSvgSnapshot(
    import.meta.path,
    "easyeda-filled-fabrication-notes-x-ray",
  )
})
