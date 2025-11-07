#!/usr/bin/env bun

import { readFileSync } from "node:fs"
import { exit } from "node:process"

const ALLOWED_DEPENDENCIES = ["looks-same", "sharp"] // Add more allowed runtime deps here

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
