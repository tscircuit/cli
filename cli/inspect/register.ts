import type { Command } from "commander"

export const registerInspect = (program: Command) => {
  program.command("inspect").description("Inspect footprints and 3D models")
}
