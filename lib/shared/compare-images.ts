import looksSame from "looks-same"
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
      await looksSame.createDiff({
        reference: b1,
        current: b2,
        diff: diffPath,
        highlightColor: "#ff00ff",
        tolerance: 2,
      })
    } else {
      await fs.writeFile(diffPath, buffer2)
    }
  }

  return { equal }
}
