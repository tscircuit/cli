#!/usr/bin/env bun

import { readFileSync } from "node:fs"
import { exit } from "node:process"

console.log("Checking for non-dev dependencies...")

try {
  // Read package.json
  const packageJson = JSON.parse(readFileSync("package.json", "utf-8"))

  // Check if dependencies section exists and has entries
  if (
    packageJson.dependencies &&
    Object.keys(packageJson.dependencies).length > 0
  ) {
    console.error(
      "Error: Regular dependencies found in package.json. Only devDependencies are allowed.",
    )
    console.error(
      "Please move all dependencies to devDependencies since this project is fully bundled.",
    )
    console.error(
      "Found dependencies:",
      Object.keys(packageJson.dependencies).join(", "),
    )
    exit(1)
  } else {
    console.log(
      "✅ No regular dependencies found. Only devDependencies are used as required.",
    )
    exit(0)
  }
} catch (error) {
  console.error("Failed to check dependencies:", error)
  exit(1)
}
