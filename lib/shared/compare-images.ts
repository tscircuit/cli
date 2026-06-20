import looksSame from "@tscircuit/image-utils/looks-same"
import fs from "node:fs/promises"

export const compareAndCreateDiff = async (
  buffer1: Uint8Array,
  buffer2: Uint8Array,
  diffPath: string,
  createDiff = true,
): Promise<{ equal: boolean }> => {
  const b1 = Buffer.from(buffer1)
  const b2 = Buffer.from(buffer2)
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
