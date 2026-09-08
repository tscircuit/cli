import { execFileSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import semver from "semver"

// Refresh after entering the publish concurrency group so queued runs see tags
// created by the previous release, even when their checkout is an older commit.
execFileSync("git", ["fetch", "origin", "--tags"], { stdio: "inherit" })

const packageJson = JSON.parse(readFileSync("package.json", "utf8"))
const latestVersion = execFileSync("git", ["tag", "--list", "v*"], {
  encoding: "utf8",
})
  .split("\n")
  .filter((tag) => /^v\d+\.\d+\.\d+$/.test(tag))
  .map((tag) => tag.slice(1))
  .filter((version) => semver.valid(version))
  .sort(semver.rcompare)[0]

if (latestVersion && semver.gt(latestVersion, packageJson.version)) {
  console.log(
    `Syncing release baseline: ${packageJson.version} -> ${latestVersion}`,
  )
  packageJson.version = latestVersion
  writeFileSync("package.json", `${JSON.stringify(packageJson, null, 2)}\n`)
}
