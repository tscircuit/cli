import type { CircuitJson, SourcePort } from "circuit-json"
import type { ConvertCircuitJsonToSysConfigOptions } from "circuit-json-to-sysconfig"
import type {
  SysconfigExportOptions,
  SysconfigPortSelector,
} from "./read-options"

function resolvePort(
  port: SysconfigPortSelector,
  ctx: { sourcePorts: SourcePort[]; source_component_id: string },
): string {
  const matches = ctx.sourcePorts.filter(
    (sourcePort) =>
      sourcePort.source_component_id === ctx.source_component_id &&
      (typeof port === "number"
        ? sourcePort.pin_number === port
        : sourcePort.name === port || sourcePort.port_hints?.includes(port)),
  )
  const selectedPort = matches[0]
  if (matches.length !== 1 || !selectedPort) {
    throw new Error(
      `Expected exactly one port ${JSON.stringify(port)} on ${ctx.source_component_id}; found ${matches.length}`,
    )
  }
  return selectedPort.source_port_id
}

export function resolveSysconfigOptions(
  options: SysconfigExportOptions,
  circuitJson: CircuitJson,
): ConvertCircuitJsonToSysConfigOptions {
  const components = circuitJson.filter(
    (element) =>
      element.type === "source_component" &&
      element.name === options.component_name,
  )
  const component = components[0]
  if (components.length !== 1 || component?.type !== "source_component") {
    throw new Error(
      `Expected exactly one component named ${JSON.stringify(options.component_name)}; found ${components.length}`,
    )
  }
  const source_component_id = component.source_component_id
  const ctx = {
    source_component_id,
    sourcePorts: circuitJson.filter(
      (element) => element.type === "source_port",
    ),
  }
  if (!("gpios" in options)) {
    return {
      source_component_id,
      source_port_id: resolvePort(options.port, ctx),
      gpio_name: options.gpio_name,
      direction: options.direction,
    }
  }
  return {
    source_component_id,
    gpios: options.gpios.map(({ port, ...request }) => ({
      ...request,
      source_port_id: resolvePort(port, ctx),
    })),
    i2c: options.i2c
      ? {
          i2c_name: options.i2c.i2c_name,
          sda_source_port_id: resolvePort(options.i2c.sda_port, ctx),
          scl_source_port_id: resolvePort(options.i2c.scl_port, ctx),
          max_bit_rate: options.i2c.max_bit_rate,
          peripheral_assignment: options.i2c.peripheral_assignment,
        }
      : undefined,
    reserved_ports: options.reserved_ports.map(({ port, reason }) => ({
      source_port_id: resolvePort(port, ctx),
      reason,
    })),
    firmware: options.firmware,
  }
}
