import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { convertToSysconfig } from "lib/shared/sysconfig-export/convert-sysconfig"
import { sysconfigExportOptionsSchema } from "lib/shared/sysconfig-export/read-options"

const circuit: CircuitJson = [
  {
    type: "source_component",
    ftype: "simple_chip",
    source_component_id: "mcu",
    name: "U1",
    manufacturer_part_number: "CC2340R52E0RGER",
  },
  {
    type: "source_port",
    source_component_id: "mcu",
    source_port_id: "signal",
    name: "SIGNAL",
    pin_number: 5,
    port_hints: ["DIO12", "pin5"],
  },
  {
    type: "source_port",
    source_component_id: "mcu",
    source_port_id: "sda",
    name: "SDA",
    pin_number: 3,
    port_hints: ["DIO8"],
  },
  {
    type: "source_port",
    source_component_id: "mcu",
    source_port_id: "scl",
    name: "SCL",
    pin_number: 19,
    port_hints: ["DIO6_A1"],
  },
]
const options = sysconfigExportOptionsSchema.parse({
  component_name: "U1",
  gpios: [
    {
      port: "SIGNAL",
      gpio_name: "CONFIG_SIGNAL",
      direction: "input",
      pull: "up",
      interrupt: "falling",
    },
  ],
  i2c: {
    i2c_name: "CONFIG_I2C_0",
    sda_port: "SDA",
    scl_port: 19,
    max_bit_rate: 100000,
    peripheral_assignment: "suggested",
  },
  reserved_ports: [],
  firmware: { rtos: "nortos" },
})

test("stable component and port selectors call the real GPIO/I2C converter", () => {
  const before = structuredClone({ circuit, options })
  const source = convertToSysconfig(circuit, options)
  expect(source).toContain('GPIO1.gpioPin.$assign = "DIO12"')
  expect(source).toContain('GPIO1.pull = "Pull Up"')
  expect(source).toContain('GPIO1.interruptTrigger = "Falling Edge"')
  expect(source).toContain('I2C1.i2c.sdaPin.$assign = "DIO8"')
  expect(source).toContain('I2C1.i2c.sclPin.$assign = "DIO6_A1_AR+"')
  expect(source).toContain("I2C1.maxBitRate = 100;")
  expect(source).toContain('I2C1.i2c.$suggestSolution = "I2C0"')
  expect({ circuit, options }).toEqual(before)
  expect(convertToSysconfig(circuit, options)).toBe(source)
})

test("reallocated generated record IDs do not change the selected circuit", () => {
  const rebuilt = circuit.map((element) => {
    if (element.type === "source_component")
      return { ...element, source_component_id: "rebuilt_mcu" }
    if (element.type === "source_port")
      return {
        ...element,
        source_component_id: "rebuilt_mcu",
        source_port_id: `rebuilt_${element.source_port_id}`,
      }
    return element
  })
  expect(convertToSysconfig(rebuilt, options)).toBe(
    convertToSysconfig(circuit, options),
  )
})

test("missing and ambiguous stable selectors fail instead of guessing", () => {
  expect(() =>
    convertToSysconfig(circuit, { ...options, component_name: "missing" }),
  ).toThrow("exactly one component")
  expect(() => convertToSysconfig([...circuit, circuit[0]], options)).toThrow(
    "exactly one component",
  )
  expect(() => convertToSysconfig([...circuit, circuit[1]], options)).toThrow(
    "exactly one port",
  )
  expect(() =>
    convertToSysconfig(
      circuit.filter(
        (element) =>
          element.type !== "source_port" || element.source_port_id !== "signal",
      ),
      options,
    ),
  ).toThrow("exactly one port")
})

test("existing converter rejects conflicting ownership and unknown devices", () => {
  const reserved = sysconfigExportOptionsSchema.parse({
    ...options,
    reserved_ports: [{ port: "SIGNAL", reason: "debug" }],
  })
  expect(() => convertToSysconfig(circuit, reserved)).toThrow(
    "already requested or reserved",
  )
  const unknownPart = circuit.map((element) =>
    element.type === "source_component"
      ? { ...element, manufacturer_part_number: "UNKNOWN" }
      : element,
  )
  expect(() => convertToSysconfig(unknownPart, options)).toThrow("Unsupported")
})

test("AM2434 single-output options use the same export path", () => {
  const source = convertToSysconfig(
    [
      {
        type: "source_component",
        ftype: "simple_chip",
        name: "U1",
        source_component_id: "mcu",
        manufacturer_part_number: "AM2434BSDFHIALVR",
      },
      {
        type: "source_port",
        source_component_id: "mcu",
        source_port_id: "led",
        name: "LED",
        port_hints: ["A7"],
      },
    ],
    sysconfigExportOptionsSchema.parse({
      component_name: "U1",
      port: "LED",
      gpio_name: "GPIO_LED",
      direction: "output",
    }),
  )
  expect(source).toContain('gpio1.MCU_GPIO.gpioPin.$assign = "A7"')
})

test("malformed options and source records fail; unrelated geometry is not required", () => {
  for (const invalid of [
    null,
    [],
    {},
    {
      ...options,
      gpios: [{ port: "SIGNAL", gpio_name: ["BAD"], direction: "input" }],
    },
    { ...options, typo: true },
  ]) {
    expect(() => sysconfigExportOptionsSchema.parse(invalid)).toThrow()
  }
  expect(() => convertToSysconfig([null], options)).toThrow()
  expect(() =>
    convertToSysconfig([...circuit, { type: "source_trace_error" }], options),
  ).toThrow("source_trace_error")
  expect(
    convertToSysconfig(
      [...circuit, { type: "schematic_group", subcircuit_id: null }],
      options,
    ),
  ).toBe(convertToSysconfig(circuit, options))
})
