/**
 * Check if a file contains binary content by attempting to decode as UTF-8.
 * If the decoded string contains replacement characters (�), the content is likely binary.
 * @param content - The file content as a Buffer
 * @returns true if the content appears to be binary, false otherwise
 */
export const hasBinaryContent = (content: Buffer): boolean => {
  // Check first 8KB for binary detection
  const checkLength = Math.min(content.length, 8192)
  const slice = content.subarray(0, checkLength)

  // Attempt to decode as UTF-8
  const decoded = slice.toString("utf-8")

  // If the decoded string contains the replacement character (U+FFFD),
  // it means there were invalid UTF-8 sequences, indicating binary content
  if (decoded.includes("\uFFFD")) {
    return true
  }

  // Also check for null bytes which indicate binary content
  for (let i = 0; i < checkLength; i++) {
    if (content[i] === 0) {
      return true
    }
  }

  return false
}
