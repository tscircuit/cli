import { readBakedAsset } from "lib/shared/baked-assets"
import { BakedAssetNotFoundError } from "lib/shared/get-platform-fetch"

export const readBakedSearchJson = async (
  directory: string,
  requestPath: string,
  signal?: AbortSignal,
): Promise<unknown> => {
  const asset = await readBakedAsset(
    directory,
    new URL(requestPath, "file:///"),
    signal,
  ).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") {
      throw new BakedAssetNotFoundError()
    }
    throw error
  })
  return JSON.parse(asset.content.toString("utf8"))
}
