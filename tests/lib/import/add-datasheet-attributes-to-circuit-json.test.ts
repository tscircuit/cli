import { expect, test } from "bun:test"
import { commonComponentProps } from "@tscircuit/props"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToTscircuit } from "circuit-json-to-tscircuit"
import { addDatasheetAttributesToCircuitJson } from "lib/import/add-datasheet-attributes-to-circuit-json"
import ts from "typescript"
import drv8818Attributes from "../../fixtures/assets/datasheets/drv8818-pin-attributes.json"
import drv8818Circuit from "../../fixtures/assets/datasheets/drv8818-supplier.circuit.json"

const circuitWithPort = (
  port: Partial<Extract<AnyCircuitElement, { type: "source_port" }>> = {},
): AnyCircuitElement[] => [
  {
    type: "source_component",
    source_component_id: "u1",
    ftype: "simple_chip",
    name: "U1",
  },
  {
    type: "source_port",
    source_component_id: "u1",
    source_port_id: "p2",
    name: "SIGNAL",
    pin_number: 2,
    ...port,
  },
]

// Evaluate only the TSX generated from this checked-in supplier fixture.
const getChipProps = (source: string) => {
  const js = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS },
  }).outputText
  const module = { exports: {} as Record<string, any> }
  const React = {
    createElement: (_type: string, props: any) => ({ props }),
  }
  new Function("React", "module", "exports", js)(React, module, module.exports)
  const component = Object.values(module.exports).find(
    (value) => typeof value === "function",
  )!
  return component({}).props
}

test("DRV8818 numeric datasheet keys survive supplier Circuit JSON to TSX on all 29 pads", () => {
  // C99045 supplier geometry and the published DRV8818PWPR attribute map.
  const circuit = drv8818Circuit as AnyCircuitElement[]
  const attributes = commonComponentProps.shape.pinAttributes.parse(
    drv8818Attributes.pin_attributes,
  )!
  const enriched = addDatasheetAttributesToCircuitJson(circuit, attributes)
  const source = convertCircuitJsonToTscircuit(enriched, {
    componentName: drv8818Attributes.chip_name,
    manufacturerPartNumber: drv8818Attributes.chip_name,
    supplierPartNumbers: { jlcpcb: ["C99045"] },
  })
  const props = getChipProps(source)
  expect(props.pinAttributes).toBeDefined()
  expect(Object.keys(props.pinAttributes)).toHaveLength(29)
  for (const [physicalPin, expected] of Object.entries(attributes)) {
    const actual = props.pinAttributes[`pin${physicalPin}`]
    for (const [field, value] of Object.entries(expected)) {
      expect(
        Array.isArray(value) ? [...actual[field]].sort() : actual[field],
      ).toEqual(Array.isArray(value) ? [...value].sort() : value)
    }
  }
  expect(props.pinAttributes.pin7.requiresGround).toBe(true)
  expect(props.pinAttributes.pin29.mustBeConnected).toBe(true)
  expect(props.pinAttributes.pin4.canUseTriState).toBe(true)
  expect(props.pinAttributes.pin28.requiresPower).toBe(true)
  expect(
    circuit.find((element) => element.type === "source_port"),
  ).not.toHaveProperty("must_be_connected")
})

test("numeric and pinN physical entries retain false, zero and serial capabilities", () => {
  const result = addDatasheetAttributesToCircuitJson(circuitWithPort(), {
    "2": { mustBeConnected: true, requiresPower: false },
    pin2: {
      mustBeConnected: false,
      providesVoltage: 0,
      capabilities: ["uart_tx", "spi_mosi"],
      activeCapabilities: ["uart_tx"],
    },
  })
  expect(result[1]).toMatchObject({
    must_be_connected: false,
    requires_power: false,
    provides_voltage: 0,
    supports_uart_tx: true,
    supports_spi_mosi: true,
    is_configured_for_uart_tx: true,
  })
})

test("physical identity prevents another pin or shared label from supplying attributes", () => {
  const result = addDatasheetAttributesToCircuitJson(
    circuitWithPort({ name: "SHARED", port_hints: ["pin1", "1", "ALIAS"] }),
    {
      "1": { requiresGround: true },
      pin1: { mustBeConnected: true },
      "2": { isInput: true },
      SHARED: { requiresPower: true },
      ALIAS: { providesVoltage: "1.8V" },
    },
  )
  expect(result[1]).toMatchObject({ is_input: true })
  for (const attribute of [
    "requires_ground",
    "requires_power",
    "provides_voltage",
    "must_be_connected",
  ])
    expect(result[1]).not.toHaveProperty(attribute)
})

test("signal-name and port-hint entries remain a fallback without a physical row", () => {
  const result = addDatasheetAttributesToCircuitJson(
    circuitWithPort({ name: "GND", port_hints: ["GROUND"] }),
    {
      GROUND: { requiresGround: true },
      GND: { mustBeConnected: true },
    },
  )
  expect(result[1]).toMatchObject({
    requires_ground: true,
    must_be_connected: true,
  })
})

test("a mismatched physical hint cannot fill a missing physical row", () => {
  const circuit = circuitWithPort({ port_hints: ["1", "pin1"] })
  const result = addDatasheetAttributesToCircuitJson(circuit, {
    "1": { requiresGround: true },
    pin1: { mustBeConnected: true },
  })
  expect(result[1]).toEqual(circuit[1])
})

test("conflicting fallback aliases leave existing attributes intact", () => {
  const circuit = circuitWithPort({
    name: "SUPPLY",
    port_hints: ["POWER"],
    requires_power: true,
  })
  const result = addDatasheetAttributesToCircuitJson(circuit, {
    POWER: { requiresVoltage: "1.8V" },
    SUPPLY: { requiresVoltage: "3.3V" },
  })
  expect(result[1]).toBe(circuit[1])
})

test("an explicitly empty physical row does not guess an exposed-pad ground", () => {
  const circuit = circuitWithPort({ name: "PAD" })
  const result = addDatasheetAttributesToCircuitJson(circuit, {
    "2": {},
    PAD: { requiresGround: true },
  })
  expect(result[1]).toEqual(circuit[1])
})

test("physical port names are recognized when pin_number is absent", () => {
  const result = addDatasheetAttributesToCircuitJson(
    circuitWithPort({ name: "pin2", pin_number: undefined }),
    { "2": { isInput: true } },
  )
  expect(result[1]).toMatchObject({ is_input: true })
})
