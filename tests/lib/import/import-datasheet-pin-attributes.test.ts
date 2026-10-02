import { expect, spyOn, test } from "bun:test"
import { commonComponentProps } from "@tscircuit/props"
import { readFile, rm } from "node:fs/promises"
import { temporaryDirectory } from "tempy"
import ts from "typescript"
import { Command } from "commander"
import { registerImport } from "cli/import/register"
import { importComponentFromJlcpcb } from "lib/import/import-component-from-jlcpcb"
import { addDatasheetAttributesToCircuitJson } from "lib/import/add-datasheet-attributes-to-circuit-json"
import { fetchDatasheetPinAttributes } from "lib/import/fetch-datasheet-pin-attributes"
import rawRegulator from "../../fixtures/assets/datasheets/C460327.raweasy.json"
import rawF1c from "../../fixtures/assets/datasheets/C1511928.raweasy.json"
import regulator from "../../fixtures/assets/datasheets/AP2127K-2.8TRG1.datasheet.json"
import f1c from "../../fixtures/assets/datasheets/F1C100S.datasheet.json"
import rawImx6 from "../../fixtures/assets/datasheets/C430888.raweasy.json"
import imx6 from "../../fixtures/assets/datasheets/MCIMX6D6AVT08AD.datasheet.json"

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

for (const [raw, response, useExactFootprint] of [
  [rawRegulator, regulator, true],
  [rawF1c, f1c, true],
  [rawRegulator, regulator, false],
  [rawF1c, f1c, false],
  [rawImx6, imx6, true],
  [rawImx6, imx6, false],
] as const) {
  test(`import adds stored attributes to every pin of ${response.datasheet.chip_name} (${useExactFootprint ? "exact" : "compact"})`, async () => {
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
      const { filePath, footprintConversion } = await importComponentFromJlcpcb(
        raw.lcsc.number,
        directory,
        { useExactFootprint },
      )
      const source = await readFile(filePath, "utf8")
      const props = getChipProps(source)
      for (const [pin, attributes] of Object.entries(
        response.datasheet.pin_attributes,
      )) {
        // BGA datasheets identify physical balls; generated TSX may key their
        // attributes by the numeric port whose labels contain that ball.
        const attributeKey = props.pinAttributes[pin]
          ? pin
          : Object.entries(props.pinLabels).find(([_key, labels]) =>
              (labels as string[]).includes(pin),
            )?.[0]
        expect(attributeKey).toBeDefined()
        for (const [name, value] of Object.entries(attributes)) {
          expect(
            Array.isArray(value)
              ? [...props.pinAttributes[attributeKey!][name]].sort()
              : props.pinAttributes[attributeKey!][name],
          ).toEqual(Array.isArray(value) ? [...value].sort() : value)
        }
      }
      expect(Object.keys(props.pinAttributes)).toHaveLength(
        // Empty source maps contain no expressible attributes and are omitted
        // from TSX; physical pin coverage is checked independently below.
        Object.values(response.datasheet.pin_attributes).filter(
          (attributes) => Object.keys(attributes).length > 0,
        ).length,
      )
      expect(datasheetRequests).toBe(1)
      expect(props.supplierPartNumbers.jlcpcb).toContain(raw.lcsc.number)
      expect(
        commonComponentProps.shape.pinAttributes.parse(props.pinAttributes),
      ).toEqual(props.pinAttributes)
      expect(Object.keys(props.pinLabels)).toHaveLength(
        response.datasheet.pin_information.length,
      )
      expect(props.manufacturerPartNumber).toBe(
        raw.dataStr.head.c_para["Manufacturer Part"],
      )
      expect(props.cadModel.objUrl).toContain(raw.lcsc.number)
      expect(props.cadModel.stepUrl).toContain(raw.lcsc.number)
      if (useExactFootprint) expect(props.footprint.type).toBe("footprint")
      else {
        expect(footprintConversion.mode).toBe("footprinter")
        expect(typeof props.footprint).toBe("string")
        if (response.datasheet.chip_name === "MCIMX6D6AVT08AD") {
          expect(props.footprint).toContain("pinnumbering(columnmajor)")
          expect(props.footprint).toContain("_missing(1)")
          expect(source).not.toContain("footprinterPinLabels")
          expect(props.pinLabels.pin1).toContain("B1")
          expect(props.pinLabels.pin25).toContain("A2")
          expect(props.pinLabels.pin624).toContain("AE25")
        }
      }
      const override = { pin1: { mustBeConnected: false } }
      expect(
        getChipProps(source, { pinAttributes: override }).pinAttributes,
      ).toEqual(override)
    } finally {
      fetchMock.mockRestore()
      await rm(directory, { recursive: true, force: true })
    }
  }, 30_000)
}

test("enriches source ports with physical-pin overrides, false/zero values and capabilities", () => {
  const original = [
    {
      type: "source_component",
      source_component_id: "u1",
      ftype: "simple_chip",
      name: "U1",
    },
    {
      type: "source_port",
      source_component_id: "u1",
      source_port_id: "p1",
      name: "VOUT",
      port_hints: ["OUTPUT"],
      pin_number: 1,
      requires_power: true,
    },
    {
      type: "source_port",
      source_component_id: "u2",
      source_port_id: "p2",
      name: "VOUT",
      pin_number: 1,
    },
  ] as const
  const result = addDatasheetAttributesToCircuitJson(
    structuredClone(original) as any,
    {
      OUTPUT: { providesVoltage: 1.8 },
      VOUT: { mustBeConnected: true },
      pin1: {
        providesVoltage: 0,
        mustBeConnected: false,
        capabilities: ["uart_tx"],
        activeCapability: "uart_tx",
        activeCapabilities: ["spi_mosi"],
      },
    },
  )
  expect(result[1]).toMatchObject({
    requires_power: true,
    provides_voltage: 0,
    must_be_connected: false,
    supports_uart_tx: true,
    is_configured_for_uart_tx: true,
    is_configured_for_spi_mosi: true,
  })
  expect(result[2]).toEqual(original[2])
  expect(original[1]).not.toHaveProperty("provides_voltage")
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
  [
    "empty attributes",
    () =>
      Response.json({
        datasheet: { chip_name: "AP2127K-28TRG1", pin_attributes: {} },
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
      expect(props.pinAttributes?.pin2?.requiresGround).toBe(true)
      expect(warn).toHaveBeenCalledTimes(warnings)
      if (warnings) {
        expect(warn.mock.calls[0]![0]).toContain(
          "pinAttributes may not be populated",
        )
      }
      if (name === "timeout") {
        expect(warn.mock.calls[0]![0]).toContain(
          "did not respond within 5 seconds",
        )
      }
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

for (const stalledPhase of ["headers", "body"] as const) {
  test(`datasheet deadline aborts a stalled response ${stalledPhase}`, async () => {
    const originalFetch = globalThis.fetch
    const originalTimeout = AbortSignal.timeout.bind(AbortSignal)
    // Assert the production deadline while shortening the wait in this test.
    const timeout = spyOn(AbortSignal, "timeout").mockImplementation((ms) => {
      expect(ms).toBe(5_000)
      return originalTimeout(100)
    })
    const warn = spyOn(console, "warn").mockImplementation(() => {})
    let releaseResponse: (() => void) | undefined
    let receivedHeaders = false
    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch: () =>
        stalledPhase === "headers"
          ? new Promise<Response>((resolve) => {
              releaseResponse = () => resolve(new Response(null))
            })
          : new Response(
              new ReadableStream({
                start(controller) {
                  controller.enqueue(new TextEncoder().encode('{"datasheet":'))
                },
              }),
            ),
    })
    const fetchMock = mockFetch(async (_input, init) => {
      const response = await originalFetch(server.url, init)
      receivedHeaders = true
      return response
    })
    try {
      expect(await fetchDatasheetPinAttributes("F1C100S")).toBeUndefined()
      expect(timeout).toHaveBeenCalledTimes(1)
      expect(receivedHeaders).toBe(stalledPhase === "body")
      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn.mock.calls[0]![0]).toContain(
        "Datasheet API did not respond within 5 seconds for F1C100S",
      )
      expect(warn.mock.calls[0]![0]).toContain(
        "pinAttributes may not be populated",
      )
    } finally {
      fetchMock.mockRestore()
      timeout.mockRestore()
      warn.mockRestore()
      releaseResponse?.()
      await server.stop(true)
    }
  })
}

for (const hasSearchResult of [true, false]) {
  test(`--exclude-pin-attributes skips the lookup (${hasSearchResult ? "search result" : "direct fallback"})`, async () => {
    const directory = temporaryDirectory()
    const previousCwd = process.cwd()
    let datasheetRequests = 0
    const fetchMock = mockFetch(async (input) => {
      const url = new URL(String(input))
      if (url.hostname === "jlcsearch.tscircuit.com") {
        return Response.json({
          components: hasSearchResult
            ? [{ lcsc: 460327, mfr: "AP2127K-2.8TRG1" }]
            : [],
        })
      }
      if (url.pathname.endsWith("/datasheets/get")) {
        datasheetRequests++
        return Response.json(regulator)
      }
      if (url.pathname === "/api/components/search") {
        return Response.json({
          success: true,
          result: { lists: { lcsc: [rawRegulator] } },
        })
      }
      if (url.pathname === `/api/components/${rawRegulator.uuid}`) {
        return Response.json({ success: true, result: rawRegulator })
      }
      return new Response(null, { status: 404 })
    })
    try {
      process.chdir(directory)
      const program = new Command()
      registerImport(program)
      await program.parseAsync(
        [
          "import",
          "--jlcpcb",
          "--exclude-pin-attributes",
          "--use-exact-footprint",
          "C460327",
        ],
        { from: "user" },
      )
      const source = await readFile(
        `${directory}/imports/AP2127K_2_8TRG1.tsx`,
        "utf8",
      )
      const props = getChipProps(source)
      expect(datasheetRequests).toBe(0)
      expect(props.pinAttributes?.pin5?.providesVoltage).toBeUndefined()
      expect(props.pinAttributes?.pin2?.requiresGround).toBe(true)
      expect(props.footprint.type).toBe("footprint")
    } finally {
      process.chdir(previousCwd)
      fetchMock.mockRestore()
      await rm(directory, { recursive: true, force: true })
    }
  })
}
