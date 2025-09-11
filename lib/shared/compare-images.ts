import looksSame from "looks-same"
import fs from "node:fs/promises"

export const compareAndCreateDiff = async (
  buffer1: Buffer,
  buffer2: Buffer,
  diffPath: string,
): Promise<{ equal: boolean }> => {
  const { equal } = await looksSame(buffer1, buffer2, {
    strict: false,
    tolerance: 2,
  })

  if (!equal) {
    if (diffPath.endsWith(".png")) {
      await looksSame.createDiff({
        reference: buffer1,
        current: buffer2,
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
