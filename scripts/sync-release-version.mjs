import { execFileSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { gt, valid } from "semver"

// Version-bump PRs can lag behind releases. Start pver from the highest
// reserved release version so its bounded tag-collision retry cannot run out.
const packageJson = JSON.parse(readFileSync("package.json", "utf8"))
if (!valid(packageJson.version)) {
  throw new Error(`Invalid package version: ${packageJson.version}`)
}

let version = packageJson.version
const tags = execFileSync("git", ["tag", "--list"], {
  encoding: "utf8",
}).split("\n")

for (const tag of tags) {
  // Only stable release tags belong to this publishing workflow.
  if (!/^v\d+\.\d+\.\d+$/.test(tag)) continue
  const tagVersion = tag.slice(1)
  if (valid(tagVersion) && gt(tagVersion, version)) version = tagVersion
}

if (version !== packageJson.version) {
  console.log(`Syncing release version: ${packageJson.version} -> ${version}`)
  packageJson.version = version
  writeFileSync("package.json", `${JSON.stringify(packageJson, null, 2)}\n`)
}
