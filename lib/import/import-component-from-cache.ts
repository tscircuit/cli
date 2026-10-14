import { normalizeManufacturerPartNumber } from "easyeda"
import fs from "node:fs/promises"
import path from "node:path"
import { z } from "zod"
import { createLocalCacheEngine } from "lib/shared/get-platform-config-with-cli-defaults"
import { normalizeChipName } from "./fetch-datasheet-pin-attributes"

const responseSchema = z.object({
  datasheet: z.object({
    datasheet_id: z.string(),
    chip_name: z.string().min(1),
    generated_tsx: z.string().refine((source) => source.trim().length > 0),
  }),
})

export const importComponentFromCache = async (
  partNumber: string,
  projectDir = process.cwd(),
): Promise<string | undefined> => {
  const directory = process.env.TSCIRCUIT_IMPORT_CACHE_DIR
  const standalone = process.env.TSCIRCUIT_STANDALONE === "1"
  if (!directory) {
    if (standalone) {
      throw new Error("Standalone import requires TSCIRCUIT_IMPORT_CACHE_DIR")
    }
    return undefined
  }

  const cache = createLocalCacheEngine(directory)
  const index = z
    .record(z.string())
    .parse(JSON.parse(cache.getItem("datasheets:index:v1") ?? "{}"))
  const key = normalizeChipName(partNumber)
  const id = Object.hasOwn(index, key) ? index[key] : undefined
  const response = id ? cache.getItem(`datasheet:${id}`) : null
  if (!response) {
    if (standalone) {
      throw new Error(
        `Part "${partNumber}" is not included in the standalone cache`,
      )
    }
    return undefined
  }

  const parsed = responseSchema.safeParse(JSON.parse(response))
  if (!parsed.success || parsed.data.datasheet.datasheet_id !== id) {
    throw new Error(`Invalid cached datasheet for "${partNumber}"`)
  }
  const { chip_name, generated_tsx } = parsed.data.datasheet
  const filePath = path.join(
    projectDir,
    "imports",
    `${normalizeManufacturerPartNumber(chip_name)}.tsx`,
  )
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, generated_tsx)
  return filePath
}
