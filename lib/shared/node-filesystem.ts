import { readFile } from "node:fs/promises"

/** Filesystem capability passed to circuit-json-to-gltf for local CAD files. */
export const nodeFilesystem = {
  readFile: async (fileUrl: URL) => new Uint8Array(await readFile(fileUrl)),
}
