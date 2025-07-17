#!/usr/bin/env bun

import { readFileSync } from "node:fs"
import { exit } from "node:process"

console.log("Checking for non-dev dependencies...")

try {
  // Read package.json
  const packageJson = JSON.parse(readFileSync("package.json", "utf-8"))

  const deps = packageJson.dependencies || {}

  // List of dependencies to ignore in this check
  const ignoreList = new Set(["looks-same"])

  // Filter out ignored deps
  const filteredDeps = Object.keys(deps).filter((d) => !ignoreList.has(d))

  if (filteredDeps.length > 0) {
    console.error(
      "Error: Regular dependencies found in package.json. Only devDependencies are allowed.",
    )
    console.error(
      "Please move all dependencies to devDependencies since this project is fully bundled.",
    )
    console.error("Found dependencies:", filteredDeps.join(", "))
    exit(1)
  } else {
    console.log(
      "✅ No regular dependencies found (except ignored). Only devDependencies are used as required.",
    )
    exit(0)
  }
} catch (error) {
  console.error("Failed to check dependencies:", error)
  exit(1)
}
