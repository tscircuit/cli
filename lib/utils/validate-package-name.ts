/**
 * Validates a package name to conform to npm/tsci package naming rules:
 */
export const validatePackageName = (name: string): string | null => {
  if (name.includes(" ")) {
    return "Package name cannot contain spaces. Use hyphens (-) instead."
  }

  // Check for special symbols
  if (!/^[a-zA-Z0-9\-_]+$/.test(name)) {
    return "Package name can only contain letters, numbers, hyphens, and underscores"
  }

  if (/^-|-$/.test(name)) {
    return "Package name cannot start or end with a hyphen"
  }

  return null
}
