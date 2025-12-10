/**
 * Sanitizes a package name to conform to npm/tsci package naming rules:
 * - Only allows letters, numbers, hyphens, underscores
 * - Converts spaces to hyphens
 * - Removes any other invalid characters
 * - Converts to lowercase
 * - Removes leading/trailing hyphens
 */
export const sanitizePackageName = (name: string): string => {
  return (
    name
      .toLowerCase()
      // Replace spaces with hyphens
      .replace(/\s+/g, "-")
      // Remove any characters that are not letters, numbers, hyphens, or underscores
      .replace(/[^a-z0-9\-_]/g, "")
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, "")
      // Replace multiple consecutive hyphens with a single hyphen
      .replace(/-+/g, "-")
  )
}
