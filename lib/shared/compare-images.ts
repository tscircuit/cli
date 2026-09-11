import looksSame from "@tscircuit/image-utils/looks-same"
import fs from "node:fs/promises"
import { convertSvgToPngBuffer } from "./convert-svg-to-png"

export const compareAndCreateDiff = async (
  buffer1: Uint8Array,
  buffer2: Uint8Array,
  diffPath: string,
  createDiff = true,
): Promise<{ equal: boolean }> => {
  if (Buffer.from(buffer1).equals(Buffer.from(buffer2))) {
    return { equal: true }
  }
  // looksSame decodes PNGs; SVG input otherwise falls back to byte equality.
  // Rasterize so generated IDs and nonvisual element ordering do not fail checks.
  const toImageBuffer = (buffer: Uint8Array) =>
    Buffer.from(
      diffPath.endsWith(".svg")
        ? convertSvgToPngBuffer(Buffer.from(buffer).toString("utf8"))
        : buffer,
    )
  const b1 = toImageBuffer(buffer1)
  const b2 = toImageBuffer(buffer2)
  const { equal } = await looksSame(b1, b2, {
    strict: false,
    tolerance: 2,
  })

  if (!equal && createDiff) {
    if (diffPath.endsWith(".png")) {
      const diffBuffer = await looksSame.createDiff({
        reference: b1,
        current: b2,
        highlightColor: "#ff00ff",
        tolerance: 2,
      })
      await fs.writeFile(diffPath, diffBuffer)
    } else {
      await fs.writeFile(diffPath, buffer2)
    }
  }

  return { equal }
}
