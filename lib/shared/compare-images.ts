import fs from "node:fs/promises"
import { PNG } from "pngjs"
import pixelmatch from "pixelmatch"

export const compareAndCreateDiff = async (
  buffer1: Buffer,
  buffer2: Buffer,
  diffPath: string,
): Promise<{ equal: boolean }> => {
  if (diffPath.endsWith(".png")) {
    const image1 = PNG.sync.read(buffer1)
    const image2 = PNG.sync.read(buffer2)
    const { width, height } = image1
    const diff = new PNG({ width, height })
    const diffPixels = pixelmatch(
      image1.data,
      image2.data,
      diff.data,
      width,
      height,
      { threshold: 0.1, diffColor: [255, 0, 255] },
    )

    if (diffPixels > 0) {
      await fs.writeFile(diffPath, PNG.sync.write(diff))
      return { equal: false }
    }

    return { equal: true }
  }

  const stripMetadata = (b: Buffer) =>
    b.toString("utf8").replace(/data-[^=]+="[^"]*"/g, "")

  const equal = stripMetadata(buffer1) === stripMetadata(buffer2)
  if (!equal) {
    await fs.writeFile(diffPath, buffer2)
  }
  return { equal }
}
