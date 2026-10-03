import type { KyInstance } from "ky"

// Large, valid packages can take longer than Ky's 10-second default to commit.
export const PACKAGE_UPLOAD_TIMEOUT_MS = 300_000

export async function uploadPackageArchive({
  ky,
  payload,
  timeoutMs = PACKAGE_UPLOAD_TIMEOUT_MS,
}: {
  ky: KyInstance
  payload: { package_name_with_version: string; archive_base64: string }
  timeoutMs?: number
}): Promise<"uploaded" | "unsupported"> {
  try {
    await ky.post("package_files/upload_archive", {
      json: payload,
      timeout: timeoutMs,
      retry: 0,
    })
    return "uploaded"
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response
      ?.status
    // Only fall back when the server explicitly lacks archive support. A
    // timeout or server error may happen after the transaction has committed.
    if (status === 404 || status === 405 || status === 501) {
      return "unsupported"
    }
    throw error
  }
}
