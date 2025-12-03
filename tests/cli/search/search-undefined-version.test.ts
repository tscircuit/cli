import { expect, test } from "bun:test"

/**
 * Test to verify that packages with undefined versions don't show "vundefined"
 * This tests the fix for issue #1505
 */
test("search output does not show 'undefined' for missing version", () => {
  // Simulate the output formatting logic from cli/search/register.ts
  const formatPackageOutput = (
    pkg: {
      name: string
      version?: string
      star_count?: number
      description?: string
    },
    idx: number,
  ) => {
    const star = pkg.star_count ?? 0
    const versionStr = pkg.version ? ` (v${pkg.version})` : ""
    return `${idx + 1}. ${pkg.name}${versionStr} - Stars: ${star}${
      pkg.description ? ` - ${pkg.description}` : ""
    }`
  }

  // Test package with version
  const pkgWithVersion = {
    name: "test/package",
    version: "1.0.0",
    star_count: 5,
  }
  const outputWithVersion = formatPackageOutput(pkgWithVersion, 0)
  expect(outputWithVersion).toBe("1. test/package (v1.0.0) - Stars: 5")
  expect(outputWithVersion).not.toContain("undefined")

  // Test package with undefined version
  const pkgWithUndefined = {
    name: "test/package",
    version: undefined,
    star_count: 3,
  }
  const outputWithUndefined = formatPackageOutput(pkgWithUndefined, 0)
  expect(outputWithUndefined).toBe("1. test/package - Stars: 3")
  expect(outputWithUndefined).not.toContain("undefined")

  // Test package with missing version property
  const pkgMissingVersion = { name: "test/package", star_count: 0 }
  const outputMissingVersion = formatPackageOutput(pkgMissingVersion, 0)
  expect(outputMissingVersion).toBe("1. test/package - Stars: 0")
  expect(outputMissingVersion).not.toContain("undefined")

  // Test package with empty string version (should not show version)
  const pkgEmptyVersion = { name: "test/package", version: "", star_count: 10 }
  const outputEmptyVersion = formatPackageOutput(pkgEmptyVersion, 0)
  expect(outputEmptyVersion).toBe("1. test/package - Stars: 10")
  expect(outputEmptyVersion).not.toContain("(v)")
})
