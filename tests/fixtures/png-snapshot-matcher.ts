import looksSame from "@tscircuit/image-utils/looks-same"
import { expect, type MatcherResult } from "bun:test"
import * as fs from "node:fs"
import * as path from "node:path"

const shouldUpdateSnapshots = (): boolean =>
  process.argv.includes("--update-snapshots") ||
  process.argv.includes("-u") ||
  Boolean(process.env.BUN_UPDATE_SNAPSHOTS)

const removeStaleDiff = (diffPath: string): void => {
  if (fs.existsSync(diffPath)) fs.unlinkSync(diffPath)
}

async function toMatchPngSnapshot(
  // biome-ignore lint/suspicious/noExplicitAny: Bun does not expose matcher context.
  this: any,
  receivedMaybePromise: Uint8Array | Promise<Uint8Array>,
  testPathOriginal: string,
  pngName?: string,
): Promise<MatcherResult> {
  const received = await receivedMaybePromise
  const testPath = testPathOriginal.replace(/\.test\.tsx?$/, "")
  const snapshotDir = path.join(path.dirname(testPath), "__snapshots__")
  const baseName = path.basename(testPath)
  const snapshotName = pngName
    ? `${baseName}-${pngName}.snap.png`
    : `${baseName}.snap.png`
  const snapshotPath = path.join(snapshotDir, snapshotName)
  const diffPath = snapshotPath.replace(/\.snap\.png$/, ".diff.png")

  fs.mkdirSync(snapshotDir, { recursive: true })
  if (!fs.existsSync(snapshotPath)) {
    fs.writeFileSync(snapshotPath, received)
    return {
      pass: true,
      message: () => `PNG snapshot created at ${snapshotPath}`,
    }
  }

  const reference = fs.readFileSync(snapshotPath)
  const comparison = await looksSame(reference, received, {
    strict: false,
    tolerance: 2,
  })

  if (shouldUpdateSnapshots()) {
    if (!comparison.equal || process.env.FORCE_BUN_UPDATE_SNAPSHOTS) {
      fs.writeFileSync(snapshotPath, received)
    }
    removeStaleDiff(diffPath)
    return {
      pass: true,
      message: () => `PNG snapshot updated at ${snapshotPath}`,
    }
  }

  if (comparison.equal) {
    removeStaleDiff(diffPath)
    return { pass: true, message: () => "PNG snapshot matches" }
  }

  const diff = await looksSame.createDiff({
    reference,
    current: received,
    highlightColor: "#ff00ff",
    tolerance: 2,
  })
  fs.writeFileSync(diffPath, diff)
  const difference =
    comparison.differentPixels !== undefined &&
    comparison.totalPixels !== undefined
      ? ` (${comparison.differentPixels}/${comparison.totalPixels} pixels differ)`
      : ""

  return {
    pass: false,
    message: () =>
      `PNG snapshot does not match${difference}. Diff saved at ${diffPath}`,
  }
}

expect.extend({
  // biome-ignore lint/suspicious/noExplicitAny: Bun matcher extension typing.
  toMatchPngSnapshot: toMatchPngSnapshot as any,
})

declare module "bun:test" {
  interface Matchers<T = unknown> {
    toMatchPngSnapshot(
      testPath: string,
      pngName?: string,
    ): Promise<MatcherResult>
  }
}
