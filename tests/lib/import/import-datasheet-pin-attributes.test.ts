import { expect, spyOn, test } from "bun:test"
import { readFile, rm } from "node:fs/promises"
import { temporaryDirectory } from "tempy"
import ts from "typescript"
import { importComponentFromJlcpcb } from "lib/import/import-component-from-jlcpcb"
import { addPinAttributesToTsx } from "lib/import/add-pin-attributes-to-tsx"
import { fetchDatasheetPinAttributes } from "lib/import/fetch-datasheet-pin-attributes"
import rawRegulator from "../../fixtures/assets/datasheets/C460327.raweasy.json"
import rawF1c from "../../fixtures/assets/datasheets/C1511928.raweasy.json"
import regulator from "../../fixtures/assets/datasheets/AP2127K-2.8TRG1.datasheet.json"
import f1c from "../../fixtures/assets/datasheets/F1C100S.datasheet.json"

// Evaluate only fixed/generated test fixtures, never API-provided TSX.
const mockFetch = (
  handler: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>,
) =>
  spyOn(globalThis, "fetch").mockImplementation(
    Object.assign(handler, { preconnect: fetch.preconnect }),
  )

const getChipProps = (source: string, props = {}) => {
  const js = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS },
  }).outputText
  const module = { exports: {} as Record<string, any> }
  const react = {
    createElement: (type: string, props: any, ...children: any[]) => ({
      type,
      props,
      children,
    }),
  }
  new Function("React", "module", "exports", js)(react, module, module.exports)
  const component = Object.values(module.exports).find(
    (value) => typeof value === "function",
  )!
  return component(props).props
}

for (const [raw, response] of [
  [rawRegulator, regulator],
  [rawF1c, f1c],
] as const) {
  test(`import adds stored attributes to every pin of ${response.datasheet.chip_name}`, async () => {
    const directory = temporaryDirectory()
    let datasheetRequests = 0
    const fetchMock = mockFetch(async (input) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith("/datasheets/get")) {
        datasheetRequests++
        expect(url.searchParams.get("chip_name")).toBe(
          response.datasheet.chip_name.toLowerCase(),
        )
        return Response.json(response)
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
    })
    try {
      const { filePath } = await importComponentFromJlcpcb(
        raw.lcsc.number,
        directory,
        { useExactFootprint: true },
      )
      const source = await readFile(filePath, "utf8")
      const props = getChipProps(source)
      expect(props.pinAttributes).toMatchObject(
        response.datasheet.pin_attributes,
      )
      expect(Object.keys(props.pinAttributes)).toHaveLength(
        response.datasheet.pin_information.length,
      )
      expect(datasheetRequests).toBe(1)
      expect(props.supplierPartNumbers.jlcpcb).toContain(raw.lcsc.number)
      expect(props.footprint.type).toBe("footprint")
      const override = { pin1: { mustBeConnected: false } }
      expect(
        getChipProps(source, { pinAttributes: override }).pinAttributes,
      ).toEqual(override)
    } finally {
      fetchMock.mockRestore()
      await rm(directory, { recursive: true, force: true })
    }
  })
}

test("merges existing per-pin attributes and supports named keys and false/zero values", () => {
  const source = `const pinAttributes = { pin1: { requiresPower: true, requiresVoltage: 5 }, GND: { requiresGround: true } } as const
  export const Part = (props: any) => <chip name="U1" pinAttributes={pinAttributes} {...props} />`
  const result = addPinAttributesToTsx(source, {
    pin1: { requiresVoltage: 2.8, mustBeConnected: false },
    GND: { providesVoltage: 0 },
    "~RESET": { isInput: true },
  })
  expect(getChipProps(result).pinAttributes).toEqual({
    pin1: { requiresPower: true, requiresVoltage: 2.8, mustBeConnected: false },
    GND: { requiresGround: true, providesVoltage: 0 },
    "~RESET": { isInput: true },
  })
})

test("adds a missing attribute before props spread and handles inline literals", () => {
  for (const source of [
    `export const Part = (props: any) => <chip name="U1" {...props} />`,
    `export const Part = () => <chip name="U1" />`,
    `export const Part = () => <chip name="U1" pinAttributes={{ pin1: { providesPower: true } }} />`,
  ]) {
    const result = addPinAttributesToTsx(source, {
      pin1: { providesVoltage: 2.8 },
    })
    expect(getChipProps(result).pinAttributes.pin1.providesVoltage).toBe(2.8)
  }
})

for (const [name, response, warnings] of [
  ["missing record", () => new Response(null, { status: 404 }), 0],
  [
    "missing attributes",
    () => Response.json({ datasheet: { chip_name: "AP2127K-28TRG1" } }),
    0,
  ],
  [
    "null attributes",
    () =>
      Response.json({
        datasheet: { chip_name: "AP2127K-28TRG1", pin_attributes: null },
      }),
    0,
  ],
  ["server error", () => new Response(null, { status: 503 }), 1],
  [
    "wrong variant",
    () =>
      Response.json({
        datasheet: {
          chip_name: "AP2127K-1.8TRG1",
          pin_attributes: { pin5: { providesVoltage: 1.8 } },
        },
      }),
    1,
  ],
  [
    "invalid attributes",
    () =>
      Response.json({
        datasheet: {
          chip_name: "AP2127K-28TRG1",
          pin_attributes: { pin5: { providesPower: "yes" } },
        },
      }),
    1,
  ],
  ["invalid JSON", () => new Response("not json"), 1],
  [
    "network error",
    () => {
      throw new Error("offline")
    },
    1,
  ],
  [
    "timeout",
    () => {
      throw new DOMException("Timed out", "TimeoutError")
    },
    1,
  ],
] as const) {
  test(`datasheet ${name} leaves original generated attributes intact`, async () => {
    const directory = temporaryDirectory()
    const warn = spyOn(console, "warn").mockImplementation(() => {})
    const fetchMock = mockFetch(async (input, init) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith("/datasheets/get")) {
        expect(init?.signal).toBeInstanceOf(AbortSignal)
        return response()
      }
      if (url.pathname === "/api/components/search")
        return Response.json({
          success: true,
          result: { lists: { lcsc: [rawRegulator] } },
        })
      if (url.pathname === `/api/components/${rawRegulator.uuid}`)
        return Response.json({ success: true, result: rawRegulator })
      return new Response(null, { status: 404 })
    })
    try {
      const { filePath } = await importComponentFromJlcpcb(
        "C460327",
        directory,
        { useExactFootprint: true },
      )
      const props = getChipProps(await readFile(filePath, "utf8"))
      expect(props.pinAttributes?.pin5?.providesVoltage).toBeUndefined()
      expect(warn).toHaveBeenCalledTimes(warnings)
    } finally {
      fetchMock.mockRestore()
      warn.mockRestore()
      await rm(directory, { recursive: true, force: true })
    }
  })
}

test("does not request a datasheet without a manufacturer part number", async () => {
  const fetchMock = spyOn(globalThis, "fetch")
  try {
    expect(await fetchDatasheetPinAttributes(undefined)).toBeUndefined()
    expect(await fetchDatasheetPinAttributes("...")).toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
  } finally {
    fetchMock.mockRestore()
  }
})
