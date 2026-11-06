import { readFile, realpath } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { isWithinDirectory } from "./jscdn-directory"

/** Read a response directory: query strings use sorted, URL-encoded JSON filenames. */
export const readFileResponse = async (root: URL, request: Request) => {
  const url = new URL(request.url)
  if (
    request.method === "POST" &&
    request.headers
      .get("content-type")
      ?.startsWith("application/x-www-form-urlencoded")
  ) {
    for (const [key, value] of new URLSearchParams(await request.text()))
      url.searchParams.append(key, value)
  } else if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not supported by file transport", {
      status: 405,
    })
  }
  request.signal.throwIfAborted()
  const rootDirectory = await realpath(fileURLToPath(root))
  let filePath = fileURLToPath(url)
  if (url.search) {
    url.searchParams.sort()
    const query = encodeURIComponent(url.searchParams.toString()).replace(
      /\*/g,
      "%2A",
    )
    filePath = path.join(filePath, `${query}.json`)
  }
  try {
    filePath = await realpath(filePath)
    if (!isWithinDirectory(rootDirectory, filePath))
      return new Response("Not found", { status: 404 })
    const content = await readFile(filePath, { signal: request.signal })
    return new Response(request.method === "HEAD" ? null : content, {
      headers: {
        "content-type": filePath.endsWith(".json")
          ? "application/json"
          : "application/octet-stream",
      },
    })
  } catch (error) {
    if (
      ["ENOENT", "ENOTDIR"].includes(
        (error as NodeJS.ErrnoException).code ?? "",
      )
    )
      return new Response("Not found", { status: 404 })
    throw error
  }
}
