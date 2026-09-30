import { readFile } from "node:fs/promises"
import { z } from "zod"

const port = z.union([z.string().min(1), z.number().int().positive()])
const identity = { port, gpio_name: z.string().min(1) }
const gpio = z.discriminatedUnion("direction", [
  z
    .object({
      ...identity,
      direction: z.literal("input"),
      pull: z.enum(["none", "up", "down"]),
      interrupt: z.enum(["none", "falling", "rising", "both"]),
    })
    .strict(),
  z
    .object({
      ...identity,
      direction: z.literal("output"),
      initial_state: z.enum(["low", "high"]),
    })
    .strict(),
])

// File syntax only. Device mapping and hardware compatibility belong to the converter.
export const sysconfigExportOptionsSchema = z.union([
  z
    .object({
      component_name: z.string().min(1),
      ...identity,
      direction: z.literal("output"),
    })
    .strict(),
  z
    .object({
      component_name: z.string().min(1),
      gpios: z.array(gpio),
      i2c: z
        .object({
          i2c_name: z.string().min(1),
          sda_port: port,
          scl_port: port,
          // Match the pinned converter's currently supported API, in bits/s.
          max_bit_rate: z.literal(100000),
          peripheral_assignment: z.enum(["suggested", "fixed"]),
        })
        .strict()
        .optional(),
      reserved_ports: z.array(
        z.object({ port, reason: z.string().min(1) }).strict(),
      ),
      firmware: z.object({ rtos: z.literal("nortos") }).strict(),
    })
    .strict(),
])

export type SysconfigExportOptions = z.infer<
  typeof sysconfigExportOptionsSchema
>
export type SysconfigPortSelector = z.infer<typeof port>

export async function readSysconfigOptions(
  filename: string,
): Promise<SysconfigExportOptions> {
  try {
    const source = await readFile(filename, "utf8")
    return sysconfigExportOptionsSchema.parse(JSON.parse(source))
  } catch (error) {
    throw new Error(
      `Invalid SysConfig options file ${filename}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}
