import { readFileSync } from "node:fs"
import { createRequire } from "node:module"

/** Read the browser bundle from the same installed tscircuit as the caller. */
export const readTscircuitBrowserBundle = (
  parent: string,
): string | undefined => {
  try {
    return readFileSync(
      createRequire(parent).resolve("tscircuit/browser"),
      "utf8",
    )
  } catch {
    return undefined
  }
}
