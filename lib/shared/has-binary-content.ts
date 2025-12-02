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
