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

/**
 * Check if a file contains binary content by looking for null bytes.
 * This is a more reliable check but requires reading the file.
 * @param content - The file content as a Buffer
 * @returns true if the content contains null bytes (binary), false otherwise
 */
export const hasBinaryContent = (content: Buffer): boolean => {
  // Check first 8KB for null bytes (common indicator of binary content)
  const checkLength = Math.min(content.length, 8192)
  for (let i = 0; i < checkLength; i++) {
    if (content[i] === 0) {
      return true
    }
  }
  return false
}
