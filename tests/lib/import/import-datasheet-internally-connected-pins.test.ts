import { expect, spyOn, test } from "bun:test"
import { readFile, rm } from "node:fs/promises"
import { temporaryDirectory } from "tempy"
import { importComponentFromJlcpcb } from "lib/import/import-component-from-jlcpcb"
import ts from "typescript"
import raw from "../../fixtures/assets/datasheets/C318884.raweasy.json"

const groups = [
  ["A", "B"],
  ["C", "D"],
]
const evaluate = (source: string, props = {}) => {
  const js = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS },
  }).outputText
  const module = { exports: {} as Record<string, any> }
  new Function("React", "module", "exports", js)(
    { createElement: (type: string, props: unknown) => ({ type, props }) },
    module,
    module.exports,
  )
  return Object.values(module.exports).find(
    (value) => typeof value === "function",
  )!(props)
}

test("tsci imports the TS-1187A-B-A-B permanent pairs into exact and compact TSX with caller overrides", async () => {
  const directory = temporaryDirectory()
  let requests = 0
  const handler = async (input: Parameters<typeof fetch>[0]) => {
    const url = new URL(String(input))
    if (url.pathname.endsWith("/datasheets/get")) {
      requests++
      return Response.json({
        datasheet: {
          chip_name: "TS-1187A-B-A-B",
          pin_attributes: null,
          internally_connected_pins: groups,
        },
      })
    }
    if (url.pathname === "/api/components/search")
      return Response.json({
        success: true,
        result: { lists: { lcsc: [raw] } },
      })
    if (url.pathname === `/api/components/${raw.uuid}`)
      return Response.json({ success: true, result: raw })
    if (url.hostname === "modelcdn.tscircuit.com")
      return new Response(null, { status: 404 })
    throw Error(`Unexpected fetch: ${url}`)
  }
  const fetchMock = spyOn(globalThis, "fetch").mockImplementation(
    Object.assign(handler, { preconnect: fetch.preconnect }),
  )
  try {
    for (const useExactFootprint of [true, false]) {
      const { filePath } = await importComponentFromJlcpcb(
        "C318884",
        directory,
        { useExactFootprint },
      )
      const source = await readFile(filePath, "utf8")
      const component = evaluate(source)
      expect(component.type).toBe("pushbutton")
      expect(component.props.internallyConnectedPins).toEqual(groups)
      expect(component.props.pinLabels).toEqual({
        pin1: ["A"],
        pin2: ["B"],
        pin3: ["C"],
        pin4: ["D"],
      })
      expect(
        evaluate(source, { internallyConnectedPins: [] }).props
          .internallyConnectedPins,
      ).toEqual([])
    }
    expect(requests).toBe(2)
    const { filePath } = await importComponentFromJlcpcb("C318884", directory, {
      excludePinAttributes: true,
      useExactFootprint: true,
    })
    expect(
      evaluate(await readFile(filePath, "utf8")).props.internallyConnectedPins,
    ).toBeUndefined()
    expect(requests).toBe(2)
  } finally {
    fetchMock.mockRestore()
    await rm(directory, { recursive: true, force: true })
  }
})
