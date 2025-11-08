import looksSame from "looks-same"
import fs from "node:fs/promises"

export const compareAndCreateDiff = async (
  buffer1: Buffer,
  buffer2: Buffer,
  diffPath: string,
): Promise<{ equal: boolean }> => {
  // For SVG files, do simple string comparison
  if (diffPath.endsWith(".svg")) {
    const content1 = buffer1.toString("utf8")
    const content2 = buffer2.toString("utf8")
    const equal = content1 === content2

    if (!equal) {
      await fs.writeFile(diffPath, buffer2)
    }

    return { equal }
  }

  // For PNG/bitmap files, use looks-same for visual comparison
  const { equal } = await looksSame(buffer1, buffer2, {
    strict: false,
    tolerance: 2,
  })

  if (!equal) {
    await looksSame.createDiff({
      reference: buffer1,
      current: buffer2,
      diff: diffPath,
      highlightColor: "#ff00ff",
      tolerance: 2,
    })
  }

  return { equal }
}
