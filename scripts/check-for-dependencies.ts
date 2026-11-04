#!/usr/bin/env bun

import { readFileSync } from "node:fs"
import { exit } from "node:process"

// The CLI needs its own compiler API and standard library files at runtime.
// Project TypeScript 7 does not provide the API used by the bundled plugins.
const ALLOWED_DEPENDENCIES: string[] = ["typescript"]

console.log("Checking for non-dev dependencies...")

try {
  // Read package.json
  const packageJson = JSON.parse(readFileSync("package.json", "utf-8"))

  const deps = packageJson.dependencies || {}
  const disallowedDeps = Object.keys(deps).filter(
    (dep) => !ALLOWED_DEPENDENCIES.includes(dep),
  )

  if (disallowedDeps.length > 0) {
    console.error(
      "❌ Error: Found non-dev dependencies not in the allowed list.",
    )
    console.error(
      "Please move all dependencies to devDependencies or explicitly allow them.",
    )
    console.error("Disallowed dependencies:", disallowedDeps.join(", "))
    exit(1)
  } else {
    console.log("✅ No disallowed regular dependencies found.")
    exit(0)
  }
} catch (error) {
  console.error("❌ Failed to check dependencies:", error)
  exit(1)
}
