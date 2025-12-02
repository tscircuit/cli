import * as path from "node:path"

/**
 * Set of file extensions that should be treated as binary files.
 * Binary files cannot be safely read as UTF-8 text and need special handling.
 */
export const BINARY_FILE_EXTENSIONS = new Set([
  // 3D model formats (common in PCB projects)
  ".glb",
  ".gltf",
  ".obj",
  ".stl",
  ".step",
  // Image formats
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  // Archive formats
  ".zip",
  ".gz",
  ".tar",
])

/**
 * Check if a file is likely a binary file based on its extension.
 * @param filePath - The path to the file (relative or absolute)
 * @returns true if the file is likely binary, false otherwise
 */
export const isBinaryFile = (filePath: string): boolean => {
  const ext = path.extname(filePath).toLowerCase()
  return BINARY_FILE_EXTENSIONS.has(ext)
}
